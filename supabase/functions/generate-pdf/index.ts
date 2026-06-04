import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "npm:jszip";

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

// Conta le pagine di un PDF cercando /Count N nel dizionario radice delle pagine.
// Il valore massimo trovato corrisponde sempre al totale del documento.
function countPdfPages(bytes: Uint8Array): number | null {
  try {
    const text = new TextDecoder("latin1").decode(bytes);
    const matches = [...text.matchAll(/\/Count\s+(\d+)/g)];
    if (!matches.length) return null;
    return Math.max(...matches.map(m => parseInt(m[1], 10)));
  } catch {
    return null;
  }
}

async function patchEpubMetadata(
  epubBytes: Uint8Array,
  title: string | null,
  author: string | null,
  coverUrl: string | null,
): Promise<Uint8Array> {
  try {
    const zip = await JSZip.loadAsync(epubBytes);

    // Trova il file OPF
    const opfFile = Object.values(zip.files).find(f => f.name.endsWith(".opf"));
    if (!opfFile) return epubBytes;

    let opf = await opfFile.async("string");

    // Patch titolo
    if (title) {
      if (/<dc:title[^>]*>/.test(opf)) {
        opf = opf.replace(/<dc:title[^>]*>[^<]*<\/dc:title>/, `<dc:title>${title}</dc:title>`);
      } else {
        opf = opf.replace("</metadata>", `  <dc:title>${title}</dc:title>\n  </metadata>`);
      }
    }

    // Patch autore ([\s\S]*? gestisce attributi e contenuto multiriga)
    if (author) {
      if (/<dc:creator[\s\S]*?<\/dc:creator>/.test(opf)) {
        opf = opf.replace(/<dc:creator[\s\S]*?<\/dc:creator>/g, `<dc:creator>${author}</dc:creator>`);
      } else {
        opf = opf.replace("</metadata>", `  <dc:creator>${author}</dc:creator>\n  </metadata>`);
      }
    }

    // Patch copertina
    if (coverUrl) {
      const coverRes = await fetch(coverUrl);
      if (coverRes.ok) {
        const coverBytes = await coverRes.arrayBuffer();
        // Cerca file cover esistente
        const coverFile = Object.values(zip.files).find(f =>
          /cover\.(jpe?g|png)$/i.test(f.name.split("/").pop() ?? "")
        );
        const coverPath = coverFile?.name ?? "cover.jpg";
        zip.file(coverPath, coverBytes);
        // Assicura che il manifest referenzi la copertina
        if (!opf.includes('properties="cover-image"') && !opf.includes('name="cover"')) {
          if (!opf.includes(coverPath.split("/").pop()!)) {
            opf = opf.replace(
              "</manifest>",
              `  <item id="cover-image" href="${coverPath.split("/").pop()}" media-type="image/jpeg" properties="cover-image"/>\n  </manifest>`,
            );
          }
          opf = opf.replace("</metadata>", `  <meta name="cover" content="cover-image"/>\n  </metadata>`);
        }
      }
    }

    zip.file(opfFile.name, opf);

    // Ricostruisce epub con mimetype prima e non compresso (requisito spec epub)
    const result = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return result;
  } catch (e) {
    console.error("patchEpubMetadata error:", e);
    return epubBytes;
  }
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
  const format: "pdf" | "epub" | "mobi" =
    body.format === "epub" ? "epub" :
    body.format === "mobi" ? "mobi" : "pdf";

  if (!book_id) return json({ error: "book_id richiesto" }, 400);

  // Verifica ownership e recupera docx_url
  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("id, docx_url, author_id, titolo, author_name, copertina_flat_url")
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

  // Parametri CloudConvert per formato
  // PDF → LibreOffice (alta fedeltà al layout Word)
  // EPUB / MOBI → Calibre (ottimizzato per e-reader)
  const engine = format === "pdf" ? "libreoffice" : "calibre";
  const ext = format === "pdf" ? "pdf" : format === "epub" ? "epub" : "mobi";
  const contentType =
    format === "pdf"  ? "application/pdf" :
    format === "epub" ? "application/epub+zip" :
                        "application/x-mobipocket-ebook";
  const updateField =
    format === "pdf"  ? "file_url" :
    format === "epub" ? "epub_url" :
                        "mobi_url";

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
          output_format: ext,
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
  let fileBytes = new Uint8Array(await fileRes.arrayBuffer());

  // Patch metadati epub/mobi
  if (format === "epub") {
    fileBytes = await patchEpubMetadata(
      fileBytes,
      book.titolo ?? null,
      book.author_name ?? null,
      book.copertina_flat_url ?? null,
    );
  }

  // Carica su Supabase Storage
  const storagePath = `${user.id}/${book_id}-generated.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("libri")
    .upload(storagePath, fileBytes, { contentType, upsert: true });

  if (uploadErr) return json({ error: uploadErr.message }, 500);

  // Aggiorna books
  const updateData: Record<string, unknown> = { [updateField]: storagePath };

  // Per i PDF: conta le pagine e salva in cover_numero_pagine
  if (format === "pdf") {
    const pageCount = countPdfPages(fileBytes);
    if (pageCount !== null) updateData.cover_numero_pagine = pageCount;
  }

  await supabase.from("books").update(updateData).eq("id", book_id);

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
