import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  const genericOk = () => new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });

  const { email } = await req.json();
  if (!email || typeof email !== "string") return genericOk();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const lookupRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
  );
  if (!lookupRes.ok) return genericOk();
  const lookupData = await lookupRes.json();
  const user = lookupData?.users?.[0];

  // Non riveliamo mai se l'email esiste o no: risposta identica in ogni caso.
  if (!user) return genericOk();

  const tempPassword = generateTempPassword();

  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: tempPassword }),
  });
  if (!updateRes.ok) return genericOk();

  await supabase.from("profiles").update({ must_change_password: true }).eq("id", user.id);

  const lingua = user.user_metadata?.lingua ?? "it";
  let { data: template } = await supabase
    .from("email_templates")
    .select("oggetto, corpo_html")
    .eq("tipo", "password_temporanea")
    .eq("lingua", lingua)
    .maybeSingle();

  if (!template) {
    const { data: fallback } = await supabase
      .from("email_templates")
      .select("oggetto, corpo_html")
      .eq("tipo", "password_temporanea")
      .eq("lingua", "it")
      .maybeSingle();
    template = fallback;
  }

  if (template) {
    const html = template.corpo_html.replaceAll("{{TEMP_PASSWORD}}", tempPassword);
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
        to: user.email,
        subject: template.oggetto,
        html,
      }),
    });
  }

  return genericOk();
});
