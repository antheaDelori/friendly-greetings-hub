import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const payload = await req.json();
  const { user, email_data } = payload;

  const lingua = user.user_metadata?.lingua ?? "it";

  const tipo =
    email_data.email_action_type === "signup" ? "conferma" :
    email_data.email_action_type === "recovery" ? "reset_password" :
    "conferma";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Cerca il template nella lingua dell'utente, fallback italiano
  let { data: template } = await supabase
    .from("email_templates")
    .select("oggetto, corpo_html")
    .eq("tipo", tipo)
    .eq("lingua", lingua)
    .maybeSingle();

  if (!template) {
    const { data: fallback } = await supabase
      .from("email_templates")
      .select("oggetto, corpo_html")
      .eq("tipo", tipo)
      .eq("lingua", "it")
      .maybeSingle();
    template = fallback;
  }

  if (!template) {
    return new Response("Template non trovato", { status: 500 });
  }

  const confirmUrl =
    `${SUPABASE_URL}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${email_data.redirect_to}`;

  const html = template.corpo_html.replace("{{CONFIRMATION_URL}}", confirmUrl);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Liberiamo la mente <noreply@liberiamo2076.com>",
      to: user.email,
      subject: template.oggetto,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
