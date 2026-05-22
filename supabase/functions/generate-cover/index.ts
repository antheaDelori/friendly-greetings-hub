import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_LIMIT = 3;
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json();
  const { action } = body;

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
        from: "Liberiamo la mente <noreply@liberiamo2076.com>",
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

  if ((count ?? 0) >= FREE_LIMIT) {
    return json({ error: "limit_reached", used: count, limit: FREE_LIMIT }, 429);
  }

  // Genera la copertina — solo illustrazione + titolo + autore, nessun logo
  const genRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt:
        `Create a professional book cover in vertical portrait format (like a real published novel). ` +
        `COVER TEXT: display the title "${book_title ?? ""}" prominently at the top, ` +
        `and the author name "${author_name ?? ""}" in a smaller font near the title. ` +
        `ILLUSTRATION: the background scene should depict — ${prompt}. ` +
        `Leave a clear empty space at the very bottom (about 15% of the cover height) for a publisher logo to be added later. ` +
        `Do NOT add any publisher name, logo, or extra text besides title and author name. ` +
        `Cinematic lighting, high-quality literary art style.`,
      n: 1,
      size: "1024x1536",
      quality: "medium",
    }),
  });

  if (!genRes.ok) {
    const err = await genRes.text();
    return json({ error: err }, 502);
  }

  const genData = await genRes.json();
  const cover_b64: string = genData.data[0].b64_json;
  const imgArray = Uint8Array.from(atob(cover_b64), (c) => c.charCodeAt(0));

  // Salva la copertina su Storage e restituisce solo l'URL — risposta piccola, niente base64
  const storagePath = `ai/${user.id}/${book_id}/${Date.now()}.png`;
  const { error: uploadErr } = await supabase.storage
    .from("copertine")
    .upload(storagePath, imgArray, { contentType: "image/png", upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 500);

  const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(storagePath);

  return json({ cover_url: urlData.publicUrl, used: (count ?? 0) + 1, limit: FREE_LIMIT });
});
