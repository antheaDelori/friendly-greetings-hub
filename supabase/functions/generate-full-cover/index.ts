import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LIBERIAMO_LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/liberiamo-logo.webp`;
// Font serif da CDN jsDelivr (WOFF, compatibile con imagescript/opentype.js)
const FONT_URL = "https://cdn.jsdelivr.net/npm/@fontsource/eb-garamond@5.0.8/files/eb-garamond-latin-400-normal.woff";

// ── Fisica ────────────────────────────────────────────────────────────────────
// 150dpi: la flat cover AI (512px) corrisponde a ~87dpi su A5 — upscale minimo
const DPI    = 150;
const MM_TO_PX = DPI / 25.4; // ≈ 5.906 px/mm

function px(mm: number): number { return Math.round(mm * MM_TO_PX); }

// Formati [w mm, h mm]
const FORMATS: Record<string, { w: number; h: number }> = {
  "a5":        { w: 148, h: 210 },
  "15x21":     { w: 150, h: 210 },
  "17x24":     { w: 170, h: 240 },
  "tascabile": { w: 105, h: 148 },
};

const FLAP_MM  = 90;   // larghezza alette (mm)
const BLEED_MM = 3;    // bleed su ogni lato (mm)

function spineWidthMm(pages: number): number {
  return Math.max(3, pages * 0.052 + 2);
}

// ── Colori RGBA uint32 ────────────────────────────────────────────────────────
const COLOR_CREAM     = 0xF5F0E8FF;
const COLOR_INK       = 0x1A1618FF;
const COLOR_SPINE_BG  = 0x14121EFF;
const COLOR_SPINE_TXT = 0xE8E3D9FF;
const COLOR_RULE      = 0x8A7D6880;  // semitrasparente
const COLOR_CUT       = 0xAAAAAA80;  // linee di taglio (semitrasparente)

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Pixel helpers ─────────────────────────────────────────────────────────────
function fillRect(img: Image, x: number, y: number, w: number, h: number, color: number): void {
  const r = (color >>> 24) & 0xff;
  const g = (color >>> 16) & 0xff;
  const b = (color >>>  8) & 0xff;
  const a = color & 0xff;
  const iw = img.width;
  const bmp = img.bitmap;
  const x1 = Math.max(0, x), y1 = Math.max(0, y);
  const x2 = Math.min(iw, x + w), y2 = Math.min(img.height, y + h);
  for (let row = y1; row < y2; row++) {
    for (let col = x1; col < x2; col++) {
      const i = 4 * (row * iw + col);
      bmp[i] = r; bmp[i+1] = g; bmp[i+2] = b; bmp[i+3] = a;
    }
  }
}

function hLine(img: Image, x: number, y: number, w: number, color: number, t = 1): void {
  fillRect(img, x, y, w, t, color);
}
function vLine(img: Image, x: number, y: number, h: number, color: number, t = 1): void {
  fillRect(img, x, y, t, h, color);
}

// ── Scala l'immagine per coprire esattamente targetW×targetH (cover-fit) ──────
// resize() e crop() modificano l'immagine in-place
function scaleToCover(img: Image, targetW: number, targetH: number): void {
  const scale = Math.max(targetW / img.width, targetH / img.height);
  const newW = Math.round(img.width  * scale);
  const newH = Math.round(img.height * scale);
  img.resize(newW, newH);
  const cropX = Math.floor((newW - targetW) / 2);
  const cropY = Math.floor((newH - targetH) / 2);
  img.crop(cropX, cropY, targetW, targetH);
}

// ── Ruota immagine 90° in senso orario (per testo spina) ─────────────────────
function rotate90cw(src: Image): Image {
  const { width: w, height: h } = src;
  const out = new Image(h, w);
  const s = src.bitmap, d = out.bitmap;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = 4 * (y * w + x);
      const di = 4 * (x * h + (h - 1 - y));
      d[di] = s[si]; d[di+1] = s[si+1]; d[di+2] = s[si+2]; d[di+3] = s[si+3];
    }
  }
  return out;
}

// ── Word wrap approssimativo ──────────────────────────────────────────────────
// factor: proporzione larghezza/altezza media del carattere (0.55 per serif)
function wrapText(text: string, widthPx: number, fontSize: number, factor = 0.55): string[] {
  const maxChars = Math.floor(widthPx / (fontSize * factor));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── Testo multilinea: ritorna altezza occupata in px ─────────────────────────
async function renderBlock(
  canvas: Image,
  font: Uint8Array,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: number,
  leading = 1.55,
): Promise<number> {
  if (!text.trim()) return 0;
  const lines = wrapText(text, maxWidth, fontSize);
  let curY = y;
  for (const line of lines) {
    if (!line.trim()) { curY += Math.round(fontSize * leading); continue; }
    try {
      const textImg = await Image.renderText(font, fontSize, line, color);
      canvas.composite(textImg, x, curY);
    } catch { /* skip linea se renderText fallisce */ }
    curY += Math.round(fontSize * leading);
  }
  return curY - y;
}

// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Non autorizzato" }, 403);

  const body = await req.json().catch(() => ({}));
  const book_id: string = body.book_id;
  if (!book_id) return json({ error: "book_id mancante" }, 400);

  // Fetch libro
  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("*")
    .eq("id", book_id)
    .eq("author_id", user.id)
    .single();
  if (bookErr || !book) return json({ error: "Libro non trovato" }, 404);

  const b = book as Record<string, unknown>;
  const flatUrl     = (b.copertina_flat_url as string | null) ?? (b.copertina_url as string | null);
  const quarta      = ((b.cover_quarta_testo     as string | null) ?? "").trim();
  const alettaSx    = ((b.cover_aletta_sx_testo  as string | null) ?? "").trim();
  const alettaDx    = ((b.cover_aletta_dx_testo  as string | null) ?? "").trim();
  const isbnText    = (b.cover_isbn   as string | null);
  const prezzo      = ((b.cover_prezzo as string | null) ?? "").trim();
  const titolo      = (b.titolo       as string | null) ?? "";
  const autore      = (b.author_name  as string | null) ?? "";
  const pages       = (b.cover_numero_pagine as number | null) ?? 200;
  const fmtKey      = (b.cover_formato as string | null) ?? "a5";
  const fmt         = FORMATS[fmtKey] ?? FORMATS["a5"];

  if (!flatUrl) return json({ error: "Copertina flat non trovata. Carica prima la copertina fronte (sezione 03)." }, 400);

  // ── Dimensioni (pixel) ────────────────────────────────────────────────────
  const flapPx  = px(FLAP_MM);
  const coverW  = px(fmt.w);
  const coverH  = px(fmt.h);
  const spinePx = px(spineWidthMm(pages));
  const bleedPx = px(BLEED_MM);
  const padPx   = px(8);   // padding interno testi

  const canvasW = flapPx + coverW + spinePx + coverW + flapPx;
  const canvasH = coverH;

  // X di inizio di ogni sezione
  const X_FLAP_SX = 0;
  const X_BACK    = flapPx;
  const X_SPINE   = flapPx + coverW;
  const X_FRONT   = flapPx + coverW + spinePx;
  const X_FLAP_DX = flapPx + coverW + spinePx + coverW;

  // ── Fetch assets in parallelo ─────────────────────────────────────────────
  const [flatRes, logoRes, fontRes] = await Promise.all([
    fetch(flatUrl),
    fetch(LIBERIAMO_LOGO_URL).catch(() => null),
    fetch(FONT_URL).catch(() => null),
  ]);

  if (!flatRes.ok) return json({ error: `Impossibile scaricare la copertina: ${flatRes.status}` }, 500);

  const [flatBytes, logoBytes, fontBytes] = await Promise.all([
    flatRes.arrayBuffer().then(ab => new Uint8Array(ab)),
    logoRes?.ok ? logoRes.arrayBuffer().then(ab => new Uint8Array(ab)) : Promise.resolve(null),
    fontRes?.ok ? fontRes.arrayBuffer().then(ab => new Uint8Array(ab)) : Promise.resolve(null),
  ]);

  const flatImg = await Image.decode(flatBytes);
  // Logo: imagescript non supporta WEBP nativamente — fallback silenzioso
  let logoImg: Image | null = null;
  if (logoBytes) {
    try { logoImg = await Image.decode(logoBytes); } catch { /* ignora */ }
  }

  // ── Canvas principale ─────────────────────────────────────────────────────
  const canvas = new Image(canvasW, canvasH);
  fillRect(canvas, 0, 0, canvasW, canvasH, COLOR_CREAM);

  // ── FRONTE: scala la flat cover per coprire l'area ───────────────────────
  scaleToCover(flatImg, coverW, coverH);
  canvas.composite(flatImg, X_FRONT, 0);

  // ── SPINA ─────────────────────────────────────────────────────────────────
  fillRect(canvas, X_SPINE, 0, spinePx, canvasH, COLOR_SPINE_BG);

  if (fontBytes) {
    // Font size: 35% della larghezza spina, min 8 max 18px
    const sf = Math.max(8, Math.min(18, Math.round(spinePx * 0.35)));

    if (titolo) {
      try {
        const tImg = await Image.renderText(fontBytes, sf, titolo.toUpperCase(), COLOR_SPINE_TXT);
        const tRot = rotate90cw(tImg);
        const tx = X_SPINE + Math.max(0, Math.floor((spinePx - tRot.width) / 2));
        const ty = canvasH - padPx - tRot.height;
        if (ty > padPx) canvas.composite(tRot, tx, ty);
      } catch { /* ignora */ }
    }
    if (autore) {
      const af = Math.max(7, Math.round(sf * 0.75));
      try {
        const aImg = await Image.renderText(fontBytes, af, autore, COLOR_SPINE_TXT);
        const aRot = rotate90cw(aImg);
        const ax = X_SPINE + Math.max(0, Math.floor((spinePx - aRot.width) / 2));
        if (ax >= X_SPINE && aRot.height < canvasH / 2) canvas.composite(aRot, ax, padPx);
      } catch { /* ignora */ }
    }
  }

  // ── RETRO ─────────────────────────────────────────────────────────────────
  const backTextW = coverW - padPx * 2;
  const backFS    = Math.round(coverH * 0.022);   // ~3.7mm font

  if (fontBytes && quarta) {
    await renderBlock(canvas, fontBytes, quarta,
      X_BACK + padPx, padPx, backTextW, backFS, COLOR_INK);
  }

  // Riga separatrice in fondo al retro
  const bottomY = canvasH - px(22);
  hLine(canvas, X_BACK + padPx, bottomY, backTextW, COLOR_RULE, 1);

  // Prezzo (in basso a sinistra del retro)
  if (fontBytes && prezzo) {
    const prFS = Math.round(backFS * 0.9);
    try {
      const prImg = await Image.renderText(fontBytes, prFS, prezzo, COLOR_INK);
      canvas.composite(prImg, X_BACK + padPx, bottomY + px(4));
    } catch { /* ignora */ }
  }

  // ISBN o logo Liberiamo (in basso a destra del retro)
  if (fontBytes && isbnText) {
    const isFS = Math.round(backFS * 0.85);
    try {
      const isImg = await Image.renderText(fontBytes, isFS, `ISBN ${isbnText}`, COLOR_INK);
      const isX = X_BACK + coverW - padPx - isImg.width;
      canvas.composite(isImg, Math.max(X_BACK + padPx, isX), bottomY + px(4));
    } catch { /* ignora */ }
  } else if (logoImg) {
    const logoMaxH = px(16);
    const logoScale = Math.min(1, logoMaxH / logoImg.height);
    const logoW = Math.round(logoImg.width  * logoScale);
    const logoH = Math.round(logoImg.height * logoScale);
    logoImg.resize(logoW, logoH);
    const logoX = X_BACK + coverW - padPx - logoImg.width;
    canvas.composite(logoImg, Math.max(X_BACK + padPx, logoX), bottomY + px(3));
  }

  // ── ALETTA SINISTRA ───────────────────────────────────────────────────────
  const flapFS = Math.round(coverH * 0.020);
  if (fontBytes && alettaSx) {
    await renderBlock(canvas, fontBytes, alettaSx,
      X_FLAP_SX + padPx, padPx, flapPx - padPx * 2, flapFS, COLOR_INK);
  }

  // ── ALETTA DESTRA ─────────────────────────────────────────────────────────
  if (fontBytes && alettaDx) {
    await renderBlock(canvas, fontBytes, alettaDx,
      X_FLAP_DX + padPx, padPx, flapPx - padPx * 2, flapFS, COLOR_INK);
  }

  // ── Encode versione pulita ─────────────────────────────────────────────────
  const cleanBytes = await canvas.encodeJPEG(92);

  // ── Versione con bleed + linee di taglio ──────────────────────────────────
  const bleedW = canvasW + bleedPx * 2;
  const bleedH = canvasH + bleedPx * 2;
  const bleedCanvas = new Image(bleedW, bleedH);
  fillRect(bleedCanvas, 0, 0, bleedW, bleedH, COLOR_CREAM);
  bleedCanvas.composite(canvas, bleedPx, bleedPx);

  // Linee di taglio (segni dove tagliare dopo la stampa)
  hLine(bleedCanvas, 0, bleedPx,         bleedW, COLOR_CUT, 1);
  hLine(bleedCanvas, 0, bleedH - bleedPx - 1, bleedW, COLOR_CUT, 1);
  vLine(bleedCanvas, bleedPx,        0, bleedH, COLOR_CUT, 1);
  vLine(bleedCanvas, bleedW - bleedPx - 1, 0, bleedH, COLOR_CUT, 1);

  const bleedBytes = await bleedCanvas.encodeJPEG(92);

  // ── Upload Storage ────────────────────────────────────────────────────────
  const ts = Date.now();
  const cleanPath = `stampa/${user.id}/${book_id}/${ts}-clean.jpg`;
  const bleedPath = `stampa/${user.id}/${book_id}/${ts}-bleed.jpg`;

  // Cancella vecchie versioni prima di caricare le nuove
  const bAny = book as Record<string, unknown>;
  const oldPaths: string[] = [];
  for (const col of ["cover_stampa_url", "cover_stampa_bleed_url"] as const) {
    const url = bAny[col] as string | null;
    if (url) {
      const marker = `/storage/v1/object/public/copertine/`;
      const idx = url.indexOf(marker);
      if (idx !== -1) oldPaths.push(decodeURIComponent(url.slice(idx + marker.length).split("?")[0]));
    }
  }
  if (oldPaths.length) await supabase.storage.from("copertine").remove(oldPaths);

  const [cleanUp, bleedUp] = await Promise.all([
    supabase.storage.from("copertine").upload(cleanPath, cleanBytes, { contentType: "image/jpeg", upsert: false }),
    supabase.storage.from("copertine").upload(bleedPath, bleedBytes, { contentType: "image/jpeg", upsert: false }),
  ]);

  if (cleanUp.error) return json({ error: `Upload clean: ${cleanUp.error.message}` }, 500);
  if (bleedUp.error) return json({ error: `Upload bleed: ${bleedUp.error.message}` }, 500);

  const { data: cleanUrl } = supabase.storage.from("copertine").getPublicUrl(cleanPath);
  const { data: bleedUrl } = supabase.storage.from("copertine").getPublicUrl(bleedPath);

  // Aggiorna DB
  await supabase.from("books").update({
    cover_stampa_url:       cleanUrl.publicUrl,
    cover_stampa_bleed_url: bleedUrl.publicUrl,
  }).eq("id", book_id);

  return json({
    stampa_url:       cleanUrl.publicUrl,
    stampa_bleed_url: bleedUrl.publicUrl,
    numero_pagine:    pages,
    canvas_mm: {
      w:     Math.round(canvasW / MM_TO_PX),
      h:     Math.round(canvasH / MM_TO_PX),
      spine: Math.round(spinePx / MM_TO_PX),
      dpi:   DPI,
    },
  });
});
