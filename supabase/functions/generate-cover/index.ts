import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_LIMIT = 10;
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;
const TECA_URL = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/teca-libro.png`;

// ── Teca dimensions (Photoshop → Image Size) ──────────────────────────────────
const TECA_W = 1024;
const TECA_H = 1536;

// Cover face corners in teca pixel space (Photoshop Info panel, central zone)
//   TL → TR → BR → BL  (clockwise in screen coords)
const FACE = [
  { x: 317, y: 234  }, // top-left
  { x: 842, y: 289  }, // top-right
  { x: 842, y: 1256 }, // bottom-right
  { x: 317, y: 1292 }, // bottom-left
];

// Logo: centered on cover face, LOGO_BOTTOM_PAD px above face bottom
const LOGO_W        = 220;
const LOGO_BOTTOM_PAD = 38;
const FACE_CENTER_X = Math.round((FACE[0].x + FACE[1].x) / 2);          // ~580
const FACE_BOTTOM_Y = Math.round((FACE[2].y + FACE[3].y) / 2);          // ~1274

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
        to: "antheaDelori@live.it",
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
        to: "antheaDelori@live.it",
        subject: `[Ticket copertina] ${book_title ?? book_id} — ${authorName}`,
        html,
      }),
    });
    if (!res.ok) return json({ error: await res.text() }, 502);
    return json({ success: true });
  }

  // ── GENERATE COVER ────────────────────────────────────────────────────────
  const { book_id, prompt, book_title, author_name } = body;
  if (!book_id || !prompt) return json({ error: "book_id e prompt richiesti" }, 400);

  const { count } = await supabase
    .from("ai_cover_attempts")
    .select("id", { count: "exact", head: true })
    .eq("book_id", book_id)
    .eq("author_id", user.id);

  const isAdmin = user.email?.toLowerCase() === "antheadelori@live.it";
  if (!isAdmin && (count ?? 0) >= FREE_LIMIT) {
    return json({ error: "limit_reached", used: count, limit: FREE_LIMIT }, 429);
  }

  // 1. GPT-4o: trasforma la descrizione in un prompt visivo creativo
  let visualPrompt = prompt;
  try {
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });
    if (gptRes.ok) {
      const gptData = await gptRes.json();
      visualPrompt = gptData.choices?.[0]?.message?.content?.trim() ?? prompt;
    }
  } catch (_) { /* fallback: usa il prompt originale */ }

  // 2. gpt-image-1: genera la copertina flat 1024×1536
  const genRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt:
        `High-end literary novel book cover. Photorealistic, sharp focus, cinematic photography style, NOT painted or illustrated. ` +
        `COVER TEXT: title "${book_title ?? ""}" in large elegant typography, ` +
        `author name "${author_name ?? ""}" in smaller font. ` +
        `VISUAL CONCEPT: ${visualPrompt}. ` +
        `Full bleed image edge to edge. No publisher logo or extra text. ` +
        `Dramatic cinematic lighting, rich color palette, professional composition.`,
      n: 1,
      size: "1024x1536",
      quality: "high",
    }),
  });
  if (!genRes.ok) return json({ error: await genRes.text() }, 502);

  const genData     = await genRes.json();
  const cover_b64: string = genData.data[0].b64_json;
  const coverRaw    = Uint8Array.from(atob(cover_b64), (c) => c.charCodeAt(0));

  // 3. Perspective warp + teca composite + logo
  let finalBytes: Uint8Array;
  let bakedTeca = false;
  try {
    const [flatCover, tecaImg, logoImg] = await Promise.all([
      Image.decode(coverRaw),
      fetch(TECA_URL).then(r => r.arrayBuffer()).then(ab => Image.decode(new Uint8Array(ab))),
      fetch(LOGO_URL).then(r => r.arrayBuffer()).then(ab => Image.decode(new Uint8Array(ab))),
    ]);

    // Warp copertina flat nella faccia della teca (prospettiva corretta)
    const canvas = warpToFace(flatCover);

    // Sovrapponi la teca (PNG con zona centrale trasparente)
    canvas.composite(tecaImg, 0, 0);

    // Logo centrato sulla faccia del libro, LOGO_BOTTOM_PAD px sopra il fondo
    const logoH = Math.round((logoImg.height / logoImg.width) * LOGO_W);
    logoImg.resize(LOGO_W, logoH);
    const logoX = FACE_CENTER_X - Math.round(LOGO_W / 2);
    const logoY = FACE_BOTTOM_Y - logoH - LOGO_BOTTOM_PAD;
    canvas.composite(logoImg, logoX, logoY);

    // Ridimensiona a OUT_W × OUT_H (512×768, ratio 2:3)
    canvas.resize(OUT_W, OUT_H);

    finalBytes = await canvas.encodeJPEG(85);
    bakedTeca = true; // compositing riuscito → segniamo nell'URL
  } catch (_) {
    // Fallback: salva la copertina flat senza teca
    finalBytes = coverRaw;
  }

  // 4. Carica su Storage
  const storagePath = `ai/${user.id}/${book_id}/${Date.now()}.jpg`;
  const { error: uploadErr } = await supabase.storage
    .from("copertine")
    .upload(storagePath, finalBytes, { contentType: "image/jpeg", upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 500);

  const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(storagePath);
  // ?v=teca segnala al frontend che la teca è già baked → disabilita l'overlay CSS
  const coverUrl = bakedTeca ? `${urlData.publicUrl}?v=teca` : urlData.publicUrl;
  return json({ cover_url: coverUrl, used: (count ?? 0) + 1, limit: FREE_LIMIT, unlimited: isAdmin });
});
