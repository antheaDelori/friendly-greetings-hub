import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL               = "antheadelori@live.it";
const BUCKET                    = "copertine";

// Protezione: la cartella "brand" e tutti i suoi file non vengono mai eliminati.
// Il check usa path.startsWith(p) sul fullPath del file (non sul prefisso della cartella)
// per evitare il bug "brand".startsWith("brand/") === false.
const PROTECTED_PREFIXES = ["brand/", "brand"];

function storagePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Admin only
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return new Response(JSON.stringify({ error: "Non autorizzato" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Tutti gli URL in uso nel DB
  const usedPaths = new Set<string>();

  const { data: books } = await supabase
    .from("books")
    .select("copertina_url, copertina_flat_url, copertina_rotta_url, cover_foto_autore_url, cover_stampa_url, cover_stampa_bleed_url");

  for (const b of books ?? []) {
    for (const url of Object.values(b)) {
      if (typeof url === "string") {
        const p = storagePath(url);
        if (p) usedPaths.add(p);
      }
    }
  }

  const { data: collane } = await supabase.from("collane").select("copertina_url");
  for (const c of collane ?? []) {
    if (typeof c.copertina_url === "string") {
      const p = storagePath(c.copertina_url);
      if (p) usedPaths.add(p);
    }
  }

  // 2. Lista tutti i file nel bucket (ricorsiva)
  const allFiles: string[] = [];

  async function listFolder(prefix: string) {
    if (PROTECTED_PREFIXES.some(p => prefix.startsWith(p))) return;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
    if (error || !data) return;
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await listFolder(fullPath);
      } else {
        allFiles.push(fullPath);
      }
    }
  }

  await listFolder("");

  // 3. File da eliminare = quelli non referenziati E non protetti
  const toDelete = allFiles.filter(path =>
    !usedPaths.has(path) &&
    !PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p.endsWith("/") ? p : p + "/"))
  );

  // 4. Elimina in blocchi da 100
  let deleted = 0;
  const errors: string[] = [];
  const CHUNK = 100;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const chunk = toDelete.slice(i, i + CHUNK);
    const { error: delErr } = await supabase.storage.from(BUCKET).remove(chunk);
    if (delErr) errors.push(delErr.message);
    else deleted += chunk.length;
  }

  return new Response(
    JSON.stringify({
      total_in_bucket: allFiles.length,
      in_use: usedPaths.size,
      deleted,
      errors,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    }
  );
});
