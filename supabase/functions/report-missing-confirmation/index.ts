const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANTHEA_LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { email, nome, cognome } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") return json({ error: "Email mancante" }, 400);

  const nomeCompleto = [nome, cognome].filter(Boolean).join(" ") || "Nuovo autore";
  const sqlQuery = `update auth.users set email_confirmed_at = now() where email = '${email.replace(/'/g, "''")}';`;

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Segnalazione mail non ricevuta</title></head><body style="margin:0;padding:0;background:#f8f7f4;font-family:Georgia,'Times New Roman',serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:32px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
    <tr><td style="padding:32px 24px;text-align:center;border-bottom:1px solid rgba(138,111,46,0.2);">
      <img src="${ANTHEA_LOGO_URL}" alt="AntheaDelori Edizioni" style="height:60px;width:auto;display:inline-block;">
      <p style="margin:12px 0 0 0;font-family:monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8a6f2e;">Anthea Delori Edizioni</p>
    </td></tr>
    <tr><td style="padding:28px 24px 8px 24px;text-align:center;">
      <p style="margin:0 0 8px 0;font-family:monospace;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#8a6f2e;opacity:0.7;">segnalazione mail non ricevuta</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:normal;color:#1a1814;letter-spacing:0.01em;">${escapeHtml(nomeCompleto)}</h1>
    </td></tr>
    <tr><td style="padding:8px 24px 24px 24px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#6b6258;">non ha ricevuto (nemmeno nello spam) la mail di conferma registrazione, inviata a<br><strong style="color:#1a1814;">${escapeHtml(email)}</strong></p>
    </td></tr>
    <tr><td style="padding:0 24px 32px 24px;">
      <p style="margin:0 0 8px 0;font-family:monospace;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#8a6f2e;opacity:0.7;">query da eseguire nel sql editor</p>
      <div style="background:#1a1814;color:#f0ebe0;font-family:monospace;font-size:12px;line-height:1.6;padding:16px;border-radius:3px;white-space:pre-wrap;word-break:break-all;">${escapeHtml(sqlQuery)}</div>
    </td></tr>
  </table></td></tr></table></body></html>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
      to: ADMIN_EMAIL,
      subject: `Segnalazione mail non ricevuta — ${email}`,
      html,
    }),
  });
  if (!resendRes.ok) return json({ error: "Invio email fallito" }, 500);

  return json({ success: true });
});
