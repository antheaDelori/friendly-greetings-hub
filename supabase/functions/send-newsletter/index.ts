import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY          = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL              = "Liberiamo la mente <notifiche@liberiamo2076.com>";
const SITE_URL                = "https://liberiamo2076.com";
const ANTHEA_LOGO_URL         = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function buildEmailHtml(opts: {
  authorName: string;
  authorEmail: string;
  bookTitle: string;
  bookSlug: string;
  bookSinossi: string;
  bookAnno: number | null;
  coverUrl: string | null;
  customMessage: string;
}): string {
  const { authorName, authorEmail, bookTitle, bookSlug, bookSinossi, coverUrl, customMessage, bookAnno } = opts;
  const bookUrl = `${SITE_URL}/leggi/${bookSlug}`;
  const anno = bookAnno ? ` · ${bookAnno}` : "";

  // Tema chiaro
  const bg       = "#f8f7f4";
  const cardBg   = "#ffffff";
  const gold     = "#8a6f2e";
  const textMain = "#1a1814";
  const textSub  = "#6b6258";
  const divider  = "rgba(138,111,46,0.2)";

  const coverBlock = coverUrl
    ? `<img src="${coverUrl}" alt="Copertina ${bookTitle}"
         style="display:block;max-width:180px;width:100%;margin:0 auto 24px auto;border-radius:3px;box-shadow:0 4px 20px rgba(0,0,0,0.12);" />`
    : "";

  const messageBlock = customMessage.trim()
    ? `<p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:${gold};font-style:italic;margin:0 0 24px 0;padding:16px 20px;border-left:3px solid ${gold};">
        ${customMessage.replace(/\n/g, "<br>")}
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Nuova pubblicazione: ${bookTitle}</title></head>
<body style="margin:0;padding:0;background:${bg};font-family:Georgia,'Times New Roman',serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${cardBg};border-radius:4px;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

  <!-- Header -->
  <tr><td style="padding:32px 24px;text-align:center;border-bottom:1px solid ${divider};">
    <img src="${ANTHEA_LOGO_URL}" alt="AntheaDelori Edizioni"
      style="height:60px;width:auto;display:inline-block;" />
    <p style="margin:12px 0 0 0;font-family:monospace;font-size:10px;letter-spacing:0.3em;
      text-transform:uppercase;color:${gold};">Anthea Delori Edizioni</p>
  </td></tr>

  <!-- Mittente -->
  <tr><td style="padding:20px 24px 0 24px;text-align:center;">
    <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.15em;
      color:${textSub};">Una comunicazione di <strong style="color:${textMain};">${authorName}</strong>
      · <a href="mailto:${authorEmail}" style="color:${gold};text-decoration:none;">${authorEmail}</a></p>
  </td></tr>

  <!-- Intro -->
  <tr><td style="padding:28px 24px 24px 24px;text-align:center;">
    <p style="margin:0 0 8px 0;font-family:monospace;font-size:11px;letter-spacing:0.25em;
      text-transform:uppercase;color:${gold};opacity:0.7;">nuova pubblicazione</p>
    <h1 style="margin:0 0 8px 0;font-family:Georgia,serif;font-size:32px;font-weight:normal;
      color:${textMain};letter-spacing:0.05em;">${bookTitle}</h1>
    <p style="margin:0;font-family:monospace;font-size:12px;letter-spacing:0.15em;
      color:${textSub};text-transform:uppercase;">${authorName}${anno}</p>
  </td></tr>

  <!-- Cover -->
  <tr><td style="padding:0 24px 32px 24px;text-align:center;">
    ${coverBlock}
  </td></tr>

  <!-- Messaggio autore -->
  ${messageBlock ? `<tr><td style="padding:0 24px 24px 24px;">${messageBlock}</td></tr>` : ""}

  <!-- Sinossi -->
  <tr><td style="padding:0 24px 32px 24px;">
    <p style="margin:0 0 8px 0;font-family:monospace;font-size:9px;letter-spacing:0.25em;
      text-transform:uppercase;color:${gold};opacity:0.6;">Il libro</p>
    <p style="margin:0;font-family:Georgia,serif;font-size:15px;line-height:1.75;
      color:${textSub};">${bookSinossi.replace(/\n/g, "<br>")}</p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 24px 40px 24px;text-align:center;">
    <a href="${bookUrl}"
      style="display:inline-block;padding:14px 36px;background:transparent;
      border:1px solid ${gold};color:${gold};font-family:monospace;font-size:11px;
      letter-spacing:0.3em;text-transform:uppercase;text-decoration:none;">
      ▸ Leggi ora
    </a>
  </td></tr>

  <!-- Separator -->
  <tr><td style="border-top:1px solid ${divider};"></td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 24px 28px 24px;text-align:center;">
    <p style="margin:0;font-family:monospace;font-size:9px;letter-spacing:0.2em;
      text-transform:uppercase;color:${textSub};opacity:0.6;">
      Hai ricevuto questa email perché segui ${authorName} su Liberiamo la mente.<br>
      Per rispondere scrivi a <a href="mailto:${authorEmail}" style="color:${gold};text-decoration:none;">${authorEmail}</a><br><br>
      <a href="${SITE_URL}" style="color:${gold};text-decoration:none;opacity:0.7;">liberiamo2076.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>

</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Non autorizzato" }, 401);

  const body = await req.json().catch(() => ({}));
  const { book_id, custom_message = "" } = body;
  if (!book_id) return json({ error: "book_id richiesto" }, 400);

  // Fetch libro (verifica ownership)
  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("id, titolo, slug, descrizione, anno, copertina_url, copertina_flat_url, author_id, author_name")
    .eq("id", book_id)
    .eq("author_id", user.id)
    .single();

  if (bookErr || !book) return json({ error: "Libro non trovato o non autorizzato" }, 404);

  // Fetch follower del questo autore
  const { data: followers } = await supabase
    .from("author_followers")
    .select("email")
    .eq("author_id", user.id);

  const followerEmails = (followers ?? []).map((f: { email: string }) => f.email).filter(Boolean);

  if (followerEmails.length === 0) {
    return json({ error: "Nessun follower da raggiungere" }, 400);
  }

  const b = book as Record<string, unknown>;
  const coverUrl = (b.copertina_flat_url as string | null) ?? (b.copertina_url as string | null);
  const sinossi  = ((b.descrizione as string | null) ?? "").trim() || "—";

  const authorName  = (b.author_name as string) || "Autore";
  const authorEmail = user.email!;

  const html = buildEmailHtml({
    authorName,
    authorEmail,
    bookTitle:     (b.titolo       as string) || "Nuova opera",
    bookSlug:      (b.slug         as string) || "",
    bookSinossi:   sinossi,
    bookAnno:      (b.anno         as number | null),
    coverUrl,
    customMessage: custom_message,
  });

  // Invia via Resend — autore in TO, follower in BCC, reply_to all'autore
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      to:       [authorEmail],
      bcc:      followerEmails,
      reply_to: `${authorName} <${authorEmail}>`,
      subject:  `Nuova pubblicazione: ${b.titolo}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return json({ error: `Errore Resend: ${err}` }, 502);
  }

  // Registra l'invio
  await supabase.from("newsletter_sends").insert({
    author_id:    user.id,
    book_id,
    recipients:   followerEmails.length,
    sent_at:      new Date().toISOString(),
  }).maybeSingle();

  return json({ sent: followerEmails.length });
});
