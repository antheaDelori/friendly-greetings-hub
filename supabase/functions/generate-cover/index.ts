import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_LIMIT = 10;
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;
const LOGO_TARGET_W = 280;
const LOGO_BOTTOM_PAD = 52;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const body = await req.json();
  const { action } = body;

  // ── RICHIESTA LINGUA — non richiede auth ──────────────────────────────────
  if (action === "langRequest") {
    const { name, email, language } = body;
    if (!email || !language) return json({ error: "email e lingua richiesti" }, 400);
    const authorDisplay = name ? `${name} <${email}>` : email;
    // Email all'admin
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
    // Email di conferma all'utente
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

  // ── TICKET REQUEST ──────────────────────────────────────────────────────────
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
<p>${message ?? "—"}</p>
    `.trim();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
        to: "antheaDelori@live.it",
        subject: `[Ticket copertina] ${book_title ?? book_id} — ${authorName}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: err }, 502);
    }
    return json({ success: true });
  }

  // ── GENERATE COVER ──────────────────────────────────────────────────────────
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

  // 1. GPT-4o trasforma la descrizione in un prompt visivo creativo
  let visualPrompt = prompt;
  try {
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
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
  } catch (_) {
    // fallback: usa il prompt originale dell'autore
  }

  // 2. Genera la copertina con il prompt visivo arricchito
  const genRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
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

  if (!genRes.ok) {
    const err = await genRes.text();
    return json({ error: err }, 502);
  }

  const genData = await genRes.json();
  const cover_b64: string = genData.data[0].b64_json;
  const coverBytes = Uint8Array.from(atob(cover_b64), (c) => c.charCodeAt(0));

  // 2. Scarica il logo e compone server-side con ImageScript
  let finalBytes: Uint8Array;
  try {
    const logoRes = await fetch(LOGO_URL);
    const logoBytes = new Uint8Array(await logoRes.arrayBuffer());

    const [coverImg, logoImg] = await Promise.all([
      Image.decode(coverBytes),
      Image.decode(logoBytes),
    ]);

    // Scala il logo a LOGO_TARGET_W px di larghezza mantenendo le proporzioni
    const logoH = Math.round((logoImg.height / logoImg.width) * LOGO_TARGET_W);
    logoImg.resize(LOGO_TARGET_W, logoH);

    // Posizione: centrato orizzontalmente, LOGO_BOTTOM_PAD px dal basso
    const logoX = Math.round((coverImg.width - LOGO_TARGET_W) / 2) + 1;
    const logoY = coverImg.height - logoH - LOGO_BOTTOM_PAD + 1;
    coverImg.composite(logoImg, logoX, logoY);

    // Ritaglia a 486×940px (finestra interna della teca: ratio 243:470)
    // scala per altezza → crop centrato in larghezza
    const TARGET_W = 486;
    const TARGET_H = 940;
    const scaleH = TARGET_H / coverImg.height;          // 940/1536 ≈ 0.612
    const scaledW = Math.round(coverImg.width * scaleH); // 1024*0.612 ≈ 627
    coverImg.resize(scaledW, TARGET_H);
    const cropX = Math.max(0, Math.round((scaledW - TARGET_W) / 2));
    coverImg.crop(cropX, 0, TARGET_W, TARGET_H);

    finalBytes = await coverImg.encodeJPEG(82);
  } catch (_) {
    // Se il compositing fallisce, salva la copertina senza logo
    finalBytes = coverBytes;
  }

  // 3. Carica il risultato finale su Storage
  const storagePath = `ai/${user.id}/${book_id}/${Date.now()}.jpg`;
  const { error: uploadErr } = await supabase.storage
    .from("copertine")
    .upload(storagePath, finalBytes, { contentType: "image/jpeg", upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 500);

  const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(storagePath);

  return json({ cover_url: urlData.publicUrl, used: (count ?? 0) + 1, limit: FREE_LIMIT, unlimited: isAdmin });
});
