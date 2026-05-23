import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function pollJob(jobId: string, maxAttempts = 40): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` },
    });
    const data = await res.json();
    const job = data.data;
    if (job.status === "finished") return job;
    if (job.status === "error") {
      const errTask = job.tasks?.find((t: any) => t.status === "error");
      throw new Error(`CloudConvert: ${errTask?.message ?? "errore sconosciuto"}`);
    }
  }
  throw new Error("Timeout: conversione troppo lenta (>2 min)");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const { book_id } = await req.json();
  if (!book_id) return json({ error: "book_id richiesto" }, 400);

  // Verifica ownership e recupera docx_url
  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("id, docx_url, author_id")
    .eq("id", book_id)
    .single();

  if (bookErr || !book) return json({ error: "Opera non trovata" }, 404);
  if (book.author_id !== user.id) return json({ error: "Non autorizzato" }, 403);
  if (!book.docx_url) return json({ error: "Nessun file .docx caricato per questa opera" }, 400);

  // Genera URL firmato (10 min) per CloudConvert
  const { data: signedData, error: signedErr } = await supabase.storage
    .from("libri")
    .createSignedUrl(book.docx_url, 600);

  if (signedErr || !signedData) {
    return json({ error: "Impossibile accedere al file .docx" }, 500);
  }

  // Sottometti job CloudConvert: docx → pdf
  const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "import-docx": {
          operation: "import/url",
          url: signedData.signedUrl,
          filename: "book.docx",
        },
        "convert-to-pdf": {
          operation: "convert",
          input: "import-docx",
          output_format: "pdf",
          engine: "libreoffice",
        },
        "export-pdf": {
          operation: "export/url",
          input: "convert-to-pdf",
          inline: false,
          archive_multiple_files: false,
        },
      },
    }),
  });

  if (!jobRes.ok) {
    const err = await jobRes.text();
    return json({ error: `CloudConvert submit error: ${err}` }, 502);
  }

  const jobData = await jobRes.json();
  const jobId = jobData.data.id;

  // Attendi il completamento
  let finishedJob: any;
  try {
    finishedJob = await pollJob(jobId);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Timeout" }, 504);
  }

  // Estrai URL di download del PDF
  const exportTask = finishedJob.tasks.find(
    (t: any) => t.operation === "export/url" && t.status === "finished",
  );
  const pdfDownloadUrl = exportTask?.result?.files?.[0]?.url;
  if (!pdfDownloadUrl) return json({ error: "PDF non trovato nel risultato CloudConvert" }, 500);

  // Scarica il PDF
  const pdfRes = await fetch(pdfDownloadUrl);
  if (!pdfRes.ok) return json({ error: "Impossibile scaricare il PDF da CloudConvert" }, 502);
  const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());

  // Carica il PDF su Supabase Storage (upsert)
  const storagePath = `${user.id}/${book_id}-generated.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("libri")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) return json({ error: uploadErr.message }, 500);

  // Aggiorna books.file_url con il path del PDF generato
  await supabase.from("books").update({ file_url: storagePath }).eq("id", book_id);

  return json({ pdf_path: storagePath });
});
