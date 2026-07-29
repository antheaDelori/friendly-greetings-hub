import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Non autorizzato" }, 401);

  const body = await req.json().catch(() => ({}));
  const pkg = body.package;
  if (pkg !== "12" && pkg !== "24") return json({ error: "package deve essere '12' o '24'" }, 400);

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, cognome, pseudonimo")
    .eq("id", user.id)
    .maybeSingle();
  const authorName = profile?.pseudonimo || [profile?.nome, profile?.cognome].filter(Boolean).join(" ") || user.email;
  const importo = pkg === "24" ? 24 : 12;

  await supabase.from("subscription_requests").insert({
    author_id: user.id,
    author_name: authorName,
    package: pkg,
    importo,
  });

  const { data: template } = await supabase
    .from("email_templates")
    .select("oggetto, corpo_html")
    .eq("tipo", "richiesta_abbonamento")
    .eq("lingua", "it")
    .maybeSingle();

  if (template) {
    const dettaglio = pkg === "24" ? " (include 1200 crediti video promozionale)" : "";
    const html = template.corpo_html
      .replaceAll("{{AUTORE_NOME}}", authorName)
      .replaceAll("{{AUTORE_EMAIL}}", user.email ?? "")
      .replaceAll("{{IMPORTO}}", String(importo))
      .replaceAll("{{DETTAGLIO}}", dettaglio);
    const oggetto = template.oggetto
      .replaceAll("{{AUTORE_NOME}}", authorName)
      .replaceAll("{{IMPORTO}}", String(importo));

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
        to: ADMIN_EMAIL,
        subject: oggetto,
        html,
      }),
    });
  }

  return json({ requested: true });
});
