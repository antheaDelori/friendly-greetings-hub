import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_LIMIT = 10;

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

  const body = await req.json();
  const { book_id } = body;
  const format: "pdf" | "epub" = body.format === "epub" ? "epub" : "pdf";

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

  // Verifica limite conversioni per questo formato
  const isAdmin = user.email?.toLowerCase() === "antheadelori@live.it";
  const { count } = await supabase
    .from("book_conversions")
    .select("id", { count: "exact", head: true })
    .eq("book_id", book_id)
    .eq("author_id", user.id)
    .eq("format", format);

  if (!isAdmin && (count ?? 0) >= FREE_LIMIT) {
    return json({ error: "limit_reached", used: count, limit: FREE_LIMIT }, 429);
  }

  // Genera URL firmato (10 min) per CloudConvert
  const { data: signedData, error: signedErr } = await supabase.storage
    .from("libri")
    .createSignedUrl(book.docx_url, 600);

  if (signedErr || !signedData) {
    return json({ error: "Impossibile accedere al file .docx" }, 500);
  }

  // Motore CloudConvert per il formato
  const outputFormat = format; // "pdf" o "epub"
  const engine = format === "epub" ? "calibre" : "libreoffice";

  // Sottometti job CloudConvert
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
        "convert-file": {
          operation: "convert",
          input: "import-docx",
          output_format: outputFormat,
          engine,
        },
        "export-file": {
          operation: "export/url",
          input: "convert-file",
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

  // Estrai URL di download
  const exportTask = finishedJob.tasks.find(
    (t: any) => t.operation === "export/url" && t.status === "finished",
  );
  const downloadUrl = exportTask?.result?.files?.[0]?.url;
  if (!downloadUrl) return json({ error: `File ${format.toUpperCase()} non trovato nel risultato CloudConvert` }, 500);

  // Scarica il file
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) return json({ error: `Impossibile scaricare il ${format.toUpperCase()} da CloudConvert` }, 502);
  const fileBytes = new Uint8Array(await fileRes.arrayBuffer());

  // Carica su Supabase Storage
  const ext = format === "epub" ? "epub" : "pdf";
  const contentType = format === "epub" ? "application/epub+zip" : "application/pdf";
  const storagePath = `${user.id}/${book_id}-generated.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("libri")
    .upload(storagePath, fileBytes, { contentType, upsert: true });

  if (uploadErr) return json({ error: uploadErr.message }, 500);

  // Aggiorna books: file_url per pdf, epub_url per epub
  const updateField = format === "epub" ? "epub_url" : "file_url";
  await supabase.from("books").update({ [updateField]: storagePath }).eq("id", book_id);

  // Registra il tentativo
  await supabase.from("book_conversions").insert({
    book_id,
    author_id: user.id,
    format,
    file_path: storagePath,
  });

  const newCount = (count ?? 0) + 1;
  return json({ file_path: storagePath, used: newCount, limit: FREE_LIMIT, unlimited: isAdmin });
});
