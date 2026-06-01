import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL               = "antheadelori@live.it";
const BUCKET                    = "copertine";

// Cartelle protette — non verranno mai toccate
const PROTECTED_PREFIXES = ["brand/"];

// Estrae il path relativo nel bucket da un URL pubblico Supabase Storage.
// Rimuove anche eventuali query string (?v=teca ecc.)
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

  // ── Autenticazione: solo admin ────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return new Response(JSON.stringify({ error: "Non autorizzato" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun: boolean = body.dry_run !== false; // default: dry run

  // ── 1. Raccoglie tutti gli URL in uso dal DB ───────────────────────────────
  const usedPaths = new Set<string>();

  // books: tutte le colonne URL copertina
  const { data: books } = await supabase
    .from("books")
    .select("copertina_url, copertina_flat_url, copertina_rotta_url, cover_foto_autore_url, cover_stampa_url, cover_stampa_bleed_url");

  for (const b of books ?? []) {
    const cols = [
      b.copertina_url,
      b.copertina_flat_url,
      b.copertina_rotta_url,
      b.cover_foto_autore_url,
      b.cover_stampa_url,
      b.cover_stampa_bleed_url,
    ];
    for (const url of cols) {
      if (url) {
        const p = storagePath(url as string);
        if (p) usedPaths.add(p);
      }
    }
  }

  // collane: copertine collana
  const { data: collane } = await supabase.from("collane").select("copertina_url");
  for (const c of collane ?? []) {
    if (c.copertina_url) {
      const p = storagePath(c.copertina_url as string);
      if (p) usedPaths.add(p);
    }
  }

  // ── 2. Lista tutti i file nel bucket (paginata, max 1000 per chiamata) ────
  const allFiles: string[] = [];

  async function listFolder(prefix: string) {
    // Salta le cartelle protette
    if (PROTECTED_PREFIXES.some(p => prefix.startsWith(p))) return;

    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
    if (error || !data) return;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // È una cartella — ricorsione
        await listFolder(fullPath);
      } else {
        // È un file
        allFiles.push(fullPath);
      }
    }
  }

  await listFolder("");

  // ── 3. Identifica i file da eliminare ────────────────────────────────────
  const toDelete = allFiles.filter(path => !usedPaths.has(path));

  // ── 4. Elimina (se non dry run) ───────────────────────────────────────────
  let deleted = 0;
  let deleteErrors: string[] = [];

  if (!dryRun && toDelete.length > 0) {
    // Supabase storage.remove accetta array di path (max ~1000 per chiamata)
    const CHUNK = 100;
    for (let i = 0; i < toDelete.length; i += CHUNK) {
      const chunk = toDelete.slice(i, i + CHUNK);
      const { error: delErr } = await supabase.storage.from(BUCKET).remove(chunk);
      if (delErr) {
        deleteErrors.push(delErr.message);
      } else {
        deleted += chunk.length;
      }
    }
  }

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      total_files_in_bucket: allFiles.length,
      files_in_use: usedPaths.size,
      files_to_delete: toDelete.length,
      deleted: dryRun ? 0 : deleted,
      errors: deleteErrors,
      // In dry_run mostra la lista completa; in produzione solo un riassunto
      preview: dryRun ? toDelete.slice(0, 50) : [],
      preview_truncated: dryRun && toDelete.length > 50,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});
