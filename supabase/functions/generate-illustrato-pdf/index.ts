import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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

// Dimensioni pagina in punti (1pt = 1/72 inch)
const FORMATS: Record<string, [number, number]> = {
  a5:        [419, 595],
  a4:        [595, 842],
  tascabile: [298, 420],
};

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
  if (!book_id) return json({ error: "book_id richiesto" }, 400);

  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("id, titolo, author_name, author_id, cover_formato, genere")
    .eq("id", book_id)
    .single();

  if (bookErr || !book) return json({ error: "Opera non trovata" }, 404);
  if (book.author_id !== user.id) return json({ error: "Non autorizzato" }, 403);
  if (book.genere !== "illustrato") return json({ error: "Solo per opere illustrate" }, 400);

  const { data: pagine } = await supabase
    .from("fumetti_pagine")
    .select("id, ordine, image_url, testo")
    .eq("book_id", book_id)
    .order("ordine");

  if (!pagine || pagine.length === 0) {
    return json({ error: "Nessuna pagina trovata. Carica le immagini prima di generare il PDF." }, 400);
  }

  const fmtKey = (book.cover_formato as string | null) ?? "a5";
  const [pageW, pageH] = FORMATS[fmtKey] ?? FORMATS["a5"];

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11;
  const pad = 45;
  const textWidth = pageW - pad * 2;
  const lineHeight = fontSize * 1.6;

  // Pagina 1: bianca (destra — apertura libro)
  pdfDoc.addPage([pageW, pageH]);

  for (const pagina of pagine) {
    // Pagina testo (sinistra)
    const textPage = pdfDoc.addPage([pageW, pageH]);
    const testo = ((pagina as any).testo ?? "").trim();
    if (testo) {
      const words = testo.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, fontSize) > textWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      let y = pageH - pad - fontSize;
      for (const l of lines) {
        if (y < pad) break;
        textPage.drawText(l, { x: pad, y, size: fontSize, font, color: rgb(0.08, 0.08, 0.08) });
        y -= lineHeight;
      }
    }

    // Pagina immagine (destra)
    const imgPage = pdfDoc.addPage([pageW, pageH]);
    try {
      const imgRes = await fetch((pagina as any).image_url);
      if (imgRes.ok) {
        const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
        const ct = imgRes.headers.get("content-type") ?? "";
        const pdfImg = ct.includes("png")
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);
        const scale = Math.min(pageW / pdfImg.width, pageH / pdfImg.height);
        const w = pdfImg.width * scale;
        const h = pdfImg.height * scale;
        imgPage.drawImage(pdfImg, {
          x: (pageW - w) / 2,
          y: (pageH - h) / 2,
          width: w,
          height: h,
        });
      }
    } catch (e) {
      console.error(`Pagina ${pagina.ordine} — errore immagine:`, e);
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pageCount = 1 + pagine.length * 2;

  const storagePath = `${user.id}/${book_id}-illustrato.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("libri")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) return json({ error: uploadErr.message }, 500);

  await supabase.from("books").update({
    file_url: storagePath,
    cover_numero_pagine: pageCount,
  }).eq("id", book_id);

  await supabase.from("book_conversions").insert({
    book_id,
    author_id: user.id,
    format: "pdf",
    file_path: storagePath,
  });

  return json({ file_path: storagePath, page_count: pageCount });
});
