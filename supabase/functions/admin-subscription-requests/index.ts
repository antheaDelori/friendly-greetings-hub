import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_LOGIN_EMAIL         = Deno.env.get("ADMIN_LOGIN_EMAIL")!;

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
  if (user.email?.toLowerCase() !== ADMIN_LOGIN_EMAIL.toLowerCase()) {
    return json({ error: "Non autorizzato" }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "list") {
    const { data, error } = await supabase
      .from("subscription_requests")
      .select("id, author_id, author_name, package, importo, created_at, activated_at")
      .is("activated_at", null)
      .order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ requests: data });
  }

  if (action === "activate") {
    const { request_id, author_id, package: pkg } = body;
    if (!author_id || (pkg !== "12" && pkg !== "24")) return json({ error: "Parametri mancanti" }, 400);

    const { error } = await supabase.rpc("admin_activate_subscription", {
      target_id: author_id,
      pkg,
      request_id: request_id ?? null,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ activated: true });
  }

  return json({ error: "Azione non riconosciuta" }, 400);
});
