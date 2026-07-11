const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  const { email, message } = await req.json();

  if (!email || typeof email !== "string" || !message || typeof message !== "string" || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Campi mancanti" }), { status: 400, headers: jsonHeaders });
  }

  const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
      to: ADMIN_EMAIL,
      reply_to: email,
      subject: `SEGNALAZIONE ACCESSO — ${email}`,
      html: `<p><strong>Da:</strong> ${escapeHtml(email)}</p><p><strong>Messaggio:</strong></p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><p style="color:#888;font-size:12px;">Data: ${now}</p>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
});
