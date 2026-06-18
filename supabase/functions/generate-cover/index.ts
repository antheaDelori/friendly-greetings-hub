import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

const FREE_LIMIT = 10;
const LOGO_URL      = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;
const TECA_URL      = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/teca-libro.png`;
const TECA_ROTTA_URL = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/teca-rotta-libro.png`;

// ── Teca dimensions (Photoshop → Image Size) ──────────────────────────────────
const TECA_W = 1024;
const TECA_H = 1536;

// ── Geometry — tutte le misure in pixel-spazio teca (1024×1536) ──────────────
//   ordine: TL → TR → BR → BL  (clockwise in screen coords)

// Faccia frontale del libro
const FACE = [
  { x: 317, y: 234  }, // TL
  { x: 842, y: 289  }, // TR
  { x: 842, y: 1256 }, // BR
  { x: 317, y: 1292 }, // BL
];

// Spine (lato sinistro del libro)
// TR/BR estesi fino a x=317 (bordo sinistro della FACE) per chiudere il gap rosso
const SPINE = [
  { x: 285, y: 227  }, // TL (+2px buffer)
  { x: 317, y: 234  }, // TR → tocca il bordo sx della FACE
  { x: 317, y: 1292 }, // BR → tocca il bordo sx della FACE
  { x: 285, y: 1296 }, // BL (+2px buffer)
];

// Riflesso spine
const SPINE_REFL = [
  { x: 285, y: 1294 }, // TL
  { x: 317, y: 1258 }, // TR — allineato con COVER_REFL
  { x: 317, y: 1272 }, // BR
  { x: 285, y: 1314 }, // BL
];

// Riflesso copertina frontale
const COVER_REFL = [
  { x: 314, y: 1296 }, // TL (AS)
  { x: 842, y: 1258 }, // TR (AD) — esteso a x=842 per coprire gap dx
  { x: 842, y: 1272 }, // BR (BD)
  { x: 314, y: 1312 }, // BL (BS)
];

// Spine source: quanti px dal bordo sinistro del cover flat usiamo per la spine
const SPINE_SOURCE_W  = 40;
// Reflection source: quanti px dal fondo del cover flat usiamo per i riflessi
const REFL_SOURCE_H   = 80;

// Logo: in basso a sinistra della faccia del libro
const LOGO_W          = 115;   // piccolo e discreto
const LOGO_BOTTOM_PAD = 36;    // px sopra il fondo della faccia
const LOGO_LEFT_PAD   = 18;    // px dal bordo sinistro della faccia
const FACE_BOTTOM_Y   = Math.round((FACE[2].y + FACE[3].y) / 2);        // ~1274

// Final output size (2:3 ratio, matches teca proportions)
const OUT_W = 512;
const OUT_H = Math.round(OUT_W * TECA_H / TECA_W); // 768

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

// ── Gaussian elimination (8×8 system for homography) ─────────────────────────
function gaussSolve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) M[row][j] -= f * M[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// ── 3×3 homography from 4 point-pairs (DLT) ──────────────────────────────────
function computeH(
  src: Array<{ x: number; y: number }>,
  dst: Array<{ x: number; y: number }>,
): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }
  return [...gaussSolve(A, b), 1]; // h8 = 1 (normalised)
}

// ── Point-in-convex-quad test (CW winding in screen coords) ──────────────────
function inQuad(px: number, py: number, q: Array<{ x: number; y: number }>): boolean {
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    if ((b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x) < -0.5) return false;
  }
  return true;
}

// ── Perspective warp: flat cover → teca face (inverse mapping + bilinear) ────
function warpToFace(cover: Image): Image {
  const cW = cover.width, cH = cover.height;

  // Source = 4 corners of the flat cover image
  const srcPts = [
    { x: 0,      y: 0      },
    { x: cW - 1, y: 0      },
    { x: cW - 1, y: cH - 1 },
    { x: 0,      y: cH - 1 },
  ];

  // Backward homography: teca pixel → cover pixel
  const H  = computeH(FACE, srcPts);
  const [h0, h1, h2, h3, h4, h5, h6, h7] = H; // h8 = 1

  // Transparent canvas (TECA_W × TECA_H, all zeros = transparent)
  const canvas = new Image(TECA_W, TECA_H);
  const out    = canvas.bitmap;
  const src    = cover.bitmap;

  const minX = Math.max(0, Math.min(...FACE.map(p => p.x)) | 0);
  const maxX = Math.min(TECA_W - 1, Math.ceil(Math.max(...FACE.map(p => p.x))));
  const minY = Math.max(0, Math.min(...FACE.map(p => p.y)) | 0);
  const maxY = Math.min(TECA_H - 1, Math.ceil(Math.max(...FACE.map(p => p.y))));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!inQuad(x, y, FACE)) continue;

      const denom = h6 * x + h7 * y + 1;
      if (Math.abs(denom) < 1e-10) continue;

      const u = (h0 * x + h1 * y + h2) / denom;
      const v = (h3 * x + h4 * y + h5) / denom;
      if (u < 0 || u >= cW || v < 0 || v >= cH) continue;

      // Bilinear interpolation
      const x0 = u | 0, y0 = v | 0;
      const x1 = x0 + 1 < cW ? x0 + 1 : x0;
      const y1 = y0 + 1 < cH ? y0 + 1 : y0;
      const fx = u - x0, fy = v - y0;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy,       w11 = fx * fy;

      const i00 = 4 * (y0 * cW + x0), i10 = 4 * (y0 * cW + x1);
      const i01 = 4 * (y1 * cW + x0), i11 = 4 * (y1 * cW + x1);
      const oi  = 4 * (y * TECA_W + x);

      out[oi]     = src[i00]     * w00 + src[i10]     * w10 + src[i01]     * w01 + src[i11]     * w11;
      out[oi + 1] = src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11;
      out[oi + 2] = src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11;
      out[oi + 3] = 255; // fully opaque
    }
  }
  return canvas;
}

// ── Warp generico: src quad → dst quad, con darkFactor e fadeY opzionale ─────
// fadeY=true → darkFactor decresce linearmente da top (pieno) a bottom (nero)
// Usato per spine (no fade) e riflessi (fade verso il basso)
function warpRegion(
  src: Image,
  srcQuad: Array<{ x: number; y: number }>,
  dstQuad: Array<{ x: number; y: number }>,
  canvas: Image,
  darkFactor: number,
  fadeY = false,
): void {
  const sW = src.width, sH = src.height;
  const H  = computeH(dstQuad, srcQuad);
  const [h0, h1, h2, h3, h4, h5, h6, h7] = H;
  const out    = canvas.bitmap;
  const srcBmp = src.bitmap;

  const minX = Math.max(0, Math.min(...dstQuad.map(p => p.x)) | 0);
  const maxX = Math.min(TECA_W - 1, Math.ceil(Math.max(...dstQuad.map(p => p.x))));
  const minY = Math.max(0, Math.min(...dstQuad.map(p => p.y)) | 0);
  const maxY = Math.min(TECA_H - 1, Math.ceil(Math.max(...dstQuad.map(p => p.y))));
  const dstH = Math.max(1, maxY - minY);

  for (let y = minY; y <= maxY; y++) {
    const localDark = fadeY
      ? darkFactor * (1 - (y - minY) / dstH)
      : darkFactor;

    for (let x = minX; x <= maxX; x++) {
      if (!inQuad(x, y, dstQuad)) continue;

      const denom = h6 * x + h7 * y + 1;
      if (Math.abs(denom) < 1e-10) continue;

      const u = (h0 * x + h1 * y + h2) / denom;
      const v = (h3 * x + h4 * y + h5) / denom;
      if (u < 0 || u >= sW || v < 0 || v >= sH) continue;

      // Bilinear interpolation
      const x0 = u | 0, y0 = v | 0;
      const x1 = x0 + 1 < sW ? x0 + 1 : x0;
      const y1 = y0 + 1 < sH ? y0 + 1 : y0;
      const fx = u - x0, fy = v - y0;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy,       w11 = fx * fy;

      const i00 = 4 * (y0 * sW + x0), i10 = 4 * (y0 * sW + x1);
      const i01 = 4 * (y1 * sW + x0), i11 = 4 * (y1 * sW + x1);
      const oi  = 4 * (y * TECA_W + x);

      out[oi]     = Math.round((srcBmp[i00]     * w00 + srcBmp[i10]     * w10 + srcBmp[i01]     * w01 + srcBmp[i11]     * w11) * localDark);
      out[oi + 1] = Math.round((srcBmp[i00 + 1] * w00 + srcBmp[i10 + 1] * w10 + srcBmp[i01 + 1] * w01 + srcBmp[i11 + 1] * w11) * localDark);
      out[oi + 2] = Math.round((srcBmp[i00 + 2] * w00 + srcBmp[i10 + 2] * w10 + srcBmp[i01 + 2] * w01 + srcBmp[i11 + 2] * w11) * localDark);
      out[oi + 3] = 255;
    }
  }
}

// ── Riflessione a gradiente colore ────────────────────────────────────────────
// Campiona il colore medio di un'area della copertina flat e lo blende sul
// pavimento della teca con fade lineare (opaco in alto → trasparente in basso).
// Nessuna compressione di pixel: risultato pulito qualunque sia la copertina.
function fillGradientReflection(
  src: Image,
  sampleX: number, sampleY: number, sampleW: number, sampleH: number,
  dstQuad: Array<{ x: number; y: number }>,
  canvas: Image,
  maxAlpha: number,
): void {
  // 1. Colore medio dell'area sorgente
  const sW = src.width;
  const srcBmp = src.bitmap;
  let r = 0, g = 0, b = 0, count = 0;
  const endY = Math.min(sampleY + sampleH, src.height);
  const endX = Math.min(sampleX + sampleW, sW);
  for (let y = sampleY; y < endY; y++) {
    for (let x = sampleX; x < endX; x++) {
      const i = 4 * (y * sW + x);
      r += srcBmp[i]; g += srcBmp[i + 1]; b += srcBmp[i + 2]; count++;
    }
  }
  if (count === 0) return;
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  // 2. Blend gradiente sul quad destinazione
  const out = canvas.bitmap;
  const minY = Math.max(0, Math.min(...dstQuad.map(p => p.y)) | 0);
  const maxY = Math.min(TECA_H - 1, Math.ceil(Math.max(...dstQuad.map(p => p.y))));
  const minX = Math.max(0, Math.min(...dstQuad.map(p => p.x)) | 0);
  const maxX = Math.min(TECA_W - 1, Math.ceil(Math.max(...dstQuad.map(p => p.x))));
  const dstH = Math.max(1, maxY - minY);

  for (let y = minY; y <= maxY; y++) {
    const t = (y - minY) / dstH;      // 0 = top, 1 = bottom
    const alpha = maxAlpha * (1 - t); // sfuma a 0 verso il basso
    if (alpha < 0.01) continue;
    for (let x = minX; x <= maxX; x++) {
      if (!inQuad(x, y, dstQuad)) continue;
      const oi = 4 * (y * TECA_W + x);
      if (out[oi + 3] === 0) continue; // salta pixel trasparenti
      out[oi]     = Math.min(255, Math.round(out[oi]     * (1 - alpha) + r * alpha));
      out[oi + 1] = Math.min(255, Math.round(out[oi + 1] * (1 - alpha) + g * alpha));
      out[oi + 2] = Math.min(255, Math.round(out[oi + 2] * (1 - alpha) + b * alpha));
    }
  }
}

// ── Logo blend: rimozione sfondo nero per soglia di luminosità ───────────────
// Pixel scuri (sfondo nero) → trasparenti. Pixel brillanti (oro, bianco) →
// opachi. Transizione morbida nella zona di softness per evitare bordi netti.
// maxAlpha: opacità massima (0-255) — abbassare per logo più discreto.
function applyLogoBlend(img: Image, threshold = 45, softness = 90, maxAlpha = 210): void {
  const bmp = img.bitmap;
  for (let i = 0; i < bmp.length; i += 4) {
    const r = bmp[i], g = bmp[i + 1], b = bmp[i + 2];
    // Canale massimo: preserva meglio i toni dorati rispetto alla media
    const brightness = Math.max(r, g, b);
    const raw = brightness <= threshold ? 0
      : brightness >= threshold + softness ? maxAlpha
      : Math.round(maxAlpha * (brightness - threshold) / softness);
    bmp[i + 3] = raw;
  }
}

// ── Pipeline condivisa: warp + teca + spine + riflessi → JPEG bytes ──────────
// Usata sia per copertine AI che per upload manuali.
// NON modifica flatCover (warpToFace crea un nuovo canvas).
async function applyBaking(
  flatCover: Image,
  tecaImg: Image,
  tecaRottaImg: Image,
): Promise<{ tecaBytes: Uint8Array; rottaBytes: Uint8Array }> {
  const cW = flatCover.width, cH = flatCover.height;
  const spineW = Math.min(SPINE_SOURCE_W, cW);
  const spineQuad = [
    { x: 0, y: 0 }, { x: spineW - 1, y: 0 },
    { x: spineW - 1, y: cH - 1 }, { x: 0, y: cH - 1 },
  ];

  const canvas = warpToFace(flatCover);
  const canvasRotta = new Image(TECA_W, TECA_H);
  canvasRotta.bitmap.set(canvas.bitmap);

  canvas.composite(tecaImg, 0, 0);
  canvasRotta.composite(tecaRottaImg, 0, 0);

  warpRegion(flatCover, spineQuad, SPINE, canvas, 0.45);
  warpRegion(flatCover, spineQuad, SPINE, canvasRotta, 0.45);

  fillGradientReflection(flatCover, 0, cH - REFL_SOURCE_H, spineW, REFL_SOURCE_H, SPINE_REFL, canvas, 0.30);
  fillGradientReflection(flatCover, 0, cH - REFL_SOURCE_H, spineW, REFL_SOURCE_H, SPINE_REFL, canvasRotta, 0.30);
  fillGradientReflection(flatCover, 0, cH - REFL_SOURCE_H, cW, REFL_SOURCE_H, COVER_REFL, canvas, 0.40);
  fillGradientReflection(flatCover, 0, cH - REFL_SOURCE_H, cW, REFL_SOURCE_H, COVER_REFL, canvasRotta, 0.40);

  canvas.resize(OUT_W, OUT_H);
  canvasRotta.resize(OUT_W, OUT_H);

  const [tecaBytes, rottaBytes] = await Promise.all([
    canvas.encodeJPEG(85),
    canvasRotta.encodeJPEG(85),
  ]);
  return { tecaBytes, rottaBytes };
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const body = await req.json();
  const { action } = body;

  // ── RICHIESTA LINGUA — non richiede auth ──────────────────────────────────
  if (action === "langRequest") {
    const { name, email, language } = body;
    if (!email || !language) return json({ error: "email e lingua richiesti" }, 400);
    const authorDisplay = name ? `${name} <${email}>` : email;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
        to: ADMIN_EMAIL,
        subject: `[Richiesta lingua] ${language} — ${authorDisplay}`,
        html: `<h2>Nuova richiesta lingua</h2><p><strong>Lingua:</strong> ${language}</p><p><strong>Da:</strong> ${authorDisplay}</p>`,
      }),
    });
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
        to: email,
        subject: "Liberiamo la mente — Richiesta lingua ricevuta",
        html: `<p>Ciao${name ? ` ${name}` : ""}!</p><p>Abbiamo ricevuto la tua richiesta per la lingua <strong>${language}</strong>.</p><p>Ti contatteremo al più presto per confermarti la disponibilità.</p><p>— Il team di Liberiamo la mente</p>`,
      }),
    });
    return json({ success: true });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── TICKET REQUEST ────────────────────────────────────────────────────────
  if (action === "ticket") {
    const { book_id, book_title, message } = body;
    const userEmail = user.email ?? "sconosciuta";
    const authorMeta = user.user_metadata;
    const authorName =
      [authorMeta?.nome, authorMeta?.cognome].filter(Boolean).join(" ") ||
      authorMeta?.pseudonimo ||
      userEmail;
    const html = `
<h2>Richiesta ticket copertine AI</h2>
<p><strong>Autore:</strong> ${authorName} &lt;${userEmail}&gt;</p>
<p><strong>Opera (book_id):</strong> ${book_id}</p>
<p><strong>Titolo:</strong> ${book_title ?? "—"}</p>
<p><strong>Messaggio:</strong></p>
<p>${message ?? "—"}</p>`.trim();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
        to: ADMIN_EMAIL,
        subject: `[Ticket copertina] ${book_title ?? book_id} — ${authorName}`,
        html,
      }),
    });
    if (!res.ok) return json({ error: await res.text() }, 502);
    return json({ success: true });
  }

  // ── BAKE COVER (upload manuale → teca prospettica) ───────────────────────
  if (action === "bakeCover") {
    const { book_id, flat_url } = body;
    if (!book_id || !flat_url) return json({ error: "book_id e flat_url richiesti" }, 400);

    // Fetch copertina flat + teche in parallelo
    const [coverRaw, tecaImg, tecaRottaImg] = await Promise.all([
      fetch(flat_url).then(r => r.arrayBuffer()).then(ab => new Uint8Array(ab)),
      fetch(TECA_URL).then(r => r.arrayBuffer()).then(ab => Image.decode(new Uint8Array(ab))),
      fetch(TECA_ROTTA_URL).then(r => r.arrayBuffer()).then(ab => Image.decode(new Uint8Array(ab))),
    ]);

    const flatCover = await Image.decode(coverRaw);
    const { tecaBytes, rottaBytes } = await applyBaking(flatCover, tecaImg, tecaRottaImg);

    const ts = Date.now();
    const tecaPath  = `manual-baked/${user.id}/${book_id}/${ts}.jpg`;
    const rottaPath = `manual-rotta/${user.id}/${book_id}/${ts}.jpg`;

    const [tecaResult, rottaResult] = await Promise.all([
      supabase.storage.from("copertine").upload(tecaPath, tecaBytes, { contentType: "image/jpeg", upsert: true }),
      supabase.storage.from("copertine").upload(rottaPath, rottaBytes, { contentType: "image/jpeg", upsert: true }),
    ]) as [{ error: { message: string } | null }, { error: { message: string } | null }];

    if (tecaResult.error) return json({ error: tecaResult.error.message }, 500);

    const { data: tecaUrlData } = supabase.storage.from("copertine").getPublicUrl(tecaPath);
    const { data: rottaUrlData } = supabase.storage.from("copertine").getPublicUrl(rottaPath);

    // ?v=teca segnala al frontend che la teca è già baked → nessun overlay CSS
    const coverUrl = `${tecaUrlData.publicUrl}?v=teca`;
    const rottaUrl = rottaResult.error ? null : rottaUrlData.publicUrl;

    return json({ cover_url: coverUrl, rotta_url: rottaUrl });
  }

  // ── GENERATE COVER ────────────────────────────────────────────────────────
  const { book_id, prompt, book_title, author_name } = body;
  if (!book_id || !prompt) return json({ error: "book_id e prompt richiesti" }, 400);

  const { count } = await supabase
    .from("ai_cover_attempts")
    .select("id", { count: "exact", head: true })
    .eq("book_id", book_id)
    .eq("author_id", user.id);

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (!isAdmin && (count ?? 0) >= FREE_LIMIT) {
    return json({ error: "limit_reached", used: count, limit: FREE_LIMIT }, 429);
  }

  // 1. GPT-4o + fetch logo in parallelo
  let visualPrompt = prompt;
  const [gptRes, logoFetchRes] = await Promise.all([
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              `You are a world-class book cover art director for major publishers (Penguin, Random House). ` +
              `Transform a book description into a powerful, award-winning visual prompt for AI image generation. ` +
              `MANDATORY RULES: ` +
              `1. NEVER use a single lonely figure walking — it is cliché and boring. ` +
              `2. Create COMPLEX multi-layered compositions: multiple visual planes, overlapping elements, rich details. ` +
              `3. Use SPECIFIC dramatic lighting: golden hour rays, deep shadows, light shafts, neon reflections, candlelight — be precise. ` +
              `4. Define an EXACT color palette: 2-3 dominant colors with contrast. Example: deep navy + amber gold + ivory. ` +
              `5. Include a CENTRAL METAPHOR or SYMBOL that embodies the book's soul — unexpected, poetic, memorable. ` +
              `6. Composition must have VISUAL TENSION: foreground subject + middle story + background atmosphere. ` +
              `7. Style: ultra photorealistic, sharp focus, cinematic photography, 8K detail. NOT painted, NOT illustrated. ` +
              `8. Output ONLY the visual prompt in English, max 150 words, no explanations. ` +
              `The result must make someone stop scrolling and NEED to pick up the book.`,
          },
          {
            role: "user",
            content: `Title: "${book_title ?? ""}"\nAuthor: "${author_name ?? ""}"\nDescription: ${prompt}`,
          },
        ],
      }),
    }),
    fetch(LOGO_URL).catch(() => null),
  ]);

  try {
    if (gptRes.ok) {
      const gptData = await gptRes.json();
      visualPrompt = gptData.choices?.[0]?.message?.content?.trim() ?? prompt;
    }
  } catch (_) { /* fallback: usa il prompt originale */ }

  // Logo opzionale: solo se il file esiste (PNG valido in Storage)
  const logoBytes = logoFetchRes?.ok ? new Uint8Array(await logoFetchRes.arrayBuffer()) : null;
  const hasLogo = !!logoBytes && logoBytes.length > 500; // >500 byte = file reale, non HTML 404

  // 2. gpt-image-1: genera la copertina flat
  //    Se il logo è disponibile → images/edits (logo come reference)
  //    Se il logo non è disponibile → images/generations (solo prompt)
  const coverFormData = new FormData();
  coverFormData.append("model", "gpt-image-1");

  if (hasLogo) {
    coverFormData.append(
      "image[]",
      new Blob([logoBytes!], { type: "image/png" }),
      "anthea-delori-logo.png",
    );
  }

  const logoInstruction = hasLogo
    ? `PUBLISHER LOGO: the Anthea Delori Edizioni logo (provided as reference image) must appear in the bottom-left corner, small (≈12% of cover width), naturally integrated — adapt its style to harmonize with the cover palette and mood. `
    : `PUBLISHER LOGO: add the text "AntheaDelori" in very small elegant serif font, bottom-left corner, subtle. `;

  coverFormData.append(
    "prompt",
    `High-end literary novel book cover. Photorealistic, sharp focus, cinematic photography style, NOT painted or illustrated. ` +
    `COVER TEXT: title "${book_title ?? ""}" in large elegant serif typography, ` +
    `author name "${author_name ?? ""}" in smaller font below the title. ` +
    logoInstruction +
    `VISUAL CONCEPT: ${visualPrompt}. ` +
    `Full bleed image edge to edge. Dramatic cinematic lighting, rich color palette, professional composition.`,
  );
  coverFormData.append("size", "1024x1536");
  coverFormData.append("quality", "high");
  coverFormData.append("n", "1");

  const apiEndpoint = hasLogo
    ? "https://api.openai.com/v1/images/edits"
    : "https://api.openai.com/v1/images/generations";

  const genRes = await fetch(apiEndpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: coverFormData,
  });
  if (!genRes.ok) return json({ error: await genRes.text() }, 502);

  const genData = await genRes.json();
  // edits può restituire url o b64_json a seconda della versione API
  let coverRaw: Uint8Array;
  if (genData.data[0].b64_json) {
    coverRaw = Uint8Array.from(atob(genData.data[0].b64_json), (c) => c.charCodeAt(0));
  } else if (genData.data[0].url) {
    const imgRes = await fetch(genData.data[0].url);
    coverRaw = new Uint8Array(await imgRes.arrayBuffer());
  } else {
    return json({ error: "Nessun dato immagine nella risposta AI" }, 502);
  }

  // 3. Perspective warp + teca composite + spine + riflessi (pipeline condivisa)
  let finalBytes: Uint8Array;
  let flatBytesForUpload: Uint8Array | null = null;
  let rottaBytesForUpload: Uint8Array | null = null;
  let bakedTeca = false;
  try {
    const [flatCover, tecaImg, tecaRottaImg] = await Promise.all([
      Image.decode(coverRaw),
      fetch(TECA_URL).then(r => r.arrayBuffer()).then(ab => Image.decode(new Uint8Array(ab))),
      fetch(TECA_ROTTA_URL).then(r => r.arrayBuffer()).then(ab => Image.decode(new Uint8Array(ab))),
    ]);

    // 3a–3h: warp + teca + spine + riflessi (via helper condiviso)
    const { tecaBytes, rottaBytes } = await applyBaking(flatCover, tecaImg, tecaRottaImg);

    // Flat: ridimensiona e codifica (flatCover non modificato da applyBaking)
    flatCover.resize(OUT_W, OUT_H);
    flatBytesForUpload = await flatCover.encodeJPEG(85);

    finalBytes = tecaBytes;
    rottaBytesForUpload = rottaBytes;
    bakedTeca = true;
  } catch (_) {
    // Fallback: salva la copertina flat senza teca
    finalBytes = coverRaw;
  }

  // 4. Carica su Storage: teca + flat + rotta in parallelo
  const ts = Date.now();
  const storagePath = `ai/${user.id}/${book_id}/${ts}.jpg`;
  const flatPath    = `ai-flat/${user.id}/${book_id}/${ts}.jpg`;
  const rottaPath   = `ai-rotta/${user.id}/${book_id}/${ts}.jpg`;

  const uploadPromises: Promise<unknown>[] = [
    supabase.storage.from("copertine").upload(storagePath, finalBytes, { contentType: "image/jpeg", upsert: false }),
  ];
  if (flatBytesForUpload) {
    uploadPromises.push(
      supabase.storage.from("copertine").upload(flatPath, flatBytesForUpload, { contentType: "image/jpeg", upsert: false }),
    );
  }
  if (rottaBytesForUpload) {
    uploadPromises.push(
      supabase.storage.from("copertine").upload(rottaPath, rottaBytesForUpload, { contentType: "image/jpeg", upsert: false }),
    );
  }
  const [tecaResult] = await Promise.all(uploadPromises) as [{ error: { message: string } | null }];
  if (tecaResult.error) return json({ error: tecaResult.error.message }, 500);

  let flatUrl: string | null = null;
  if (flatBytesForUpload) {
    const { data: flatUrlData } = supabase.storage.from("copertine").getPublicUrl(flatPath);
    flatUrl = flatUrlData.publicUrl;
  }

  let rottaUrl: string | null = null;
  if (rottaBytesForUpload) {
    const { data: rottaUrlData } = supabase.storage.from("copertine").getPublicUrl(rottaPath);
    rottaUrl = rottaUrlData.publicUrl;
  }

  const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(storagePath);
  // ?v=teca segnala al frontend che la teca è già baked → disabilita l'overlay CSS
  const coverUrl = bakedTeca ? `${urlData.publicUrl}?v=teca` : urlData.publicUrl;
  return json({ cover_url: coverUrl, flat_url: flatUrl, rotta_url: rottaUrl, used: (count ?? 0) + 1, limit: FREE_LIMIT, unlimited: isAdmin });
});
