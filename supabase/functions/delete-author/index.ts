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

  // Auth: solo l'admin può chiamare questa funzione
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Non autorizzato" }, 401);
  if (user.email?.toLowerCase() !== ADMIN_LOGIN_EMAIL.toLowerCase()) {
    return json({ error: "Non autorizzato" }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const { author_id } = body;
  if (!author_id) return json({ error: "author_id richiesto" }, 400);

  const { error } = await supabase.rpc("admin_delete_author", { target_id: author_id });
  if (error) return json({ error: error.message }, 500);

  return json({ deleted: true });
});
