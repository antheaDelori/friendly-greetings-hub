import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY        = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL           = Deno.env.get("ADMIN_EMAIL")!;

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

// Blacklist parole italiane offensive — primo livello di controllo
const IT_BLACKLIST = [
  "merda", "cazzo", "vaffanculo", "fanculo", "stronzo", "stronza", "coglione",
  "cogliona", "bastardo", "bastarda", "puttana", "troia", "frocio", "negro",
  "nègro", "ritardato", "mongoloide", "idiota", "imbecille", "deficiente",
  "figlio di puttana", "vaffa", "porco dio", "porcodio", "mannaggia",
];

function checkBlacklist(text: string): boolean {
  const lower = text.toLowerCase();
  return IT_BLACKLIST.some(w => lower.includes(w));
}

// Chiama OpenAI Moderation API
async function moderateText(text: string): Promise<{ flagged: boolean; score: number; blocked: boolean }> {
  // Blacklist italiana — blocco immediato
  if (checkBlacklist(text)) {
    return { flagged: true, score: 1, blocked: true };
  }

  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text }),
  });

  if (!res.ok) return { flagged: false, score: 0, blocked: false };

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return { flagged: false, score: 0, blocked: false };

  // Punteggio massimo tra tutte le categorie
  const scores = Object.values(result.category_scores ?? {}) as number[];
  const score = scores.length ? Math.max(...scores) : 0;

  return {
    flagged: score > 0.55,   // flagga per revisione admin
    blocked: score > 0.80,   // blocca direttamente
    score,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: "Non autorizzato" }, 401);

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // ── Analizza testo prima di salvare ──────────────────────────────
  if (action === "analyze") {
    const { text } = body;
    if (!text?.trim()) return json({ flagged: false, blocked: false, score: 0 });

    const result = await moderateText(text);
    return json(result);
  }

  // ── Segnala una recensione ────────────────────────────────────────
  if (action === "report") {
    const { recensione_id, reason } = body;
    if (!recensione_id) return json({ error: "recensione_id richiesto" }, 400);

    // Salva segnalazione (ignora duplicati)
    await supabase.from("content_reports").upsert(
      { recensione_id, reporter_id: user.id, reason: reason ?? null },
      { onConflict: "recensione_id,reporter_id", ignoreDuplicates: true }
    );

    // Conta segnalazioni: se >= 3 flagga automaticamente
    const { count } = await supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("recensione_id", recensione_id);

    if ((count ?? 0) >= 3) {
      await supabase.from("recensioni")
        .update({ flagged: true, flag_reason: "segnalato da 3+ utenti" })
        .eq("id", recensione_id);
    }

    return json({ reported: true });
  }

  // ── Blocca/sblocca una recensione (admin, o autore dell'opera recensita) ──
  if (action === "block" || action === "unblock") {
    const { recensione_id } = body;
    if (!recensione_id) return json({ error: "recensione_id richiesto" }, 400);

    if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
      const { data: recensione } = await supabase
        .from("recensioni")
        .select("books(author_id)")
        .eq("id", recensione_id)
        .single();
      const authorId = (recensione?.books as { author_id?: string } | null)?.author_id;
      if (authorId !== user.id) return json({ error: "Non autorizzato" }, 403);
    }

    if (action === "block") {
      await supabase.from("recensioni").update({ blocked: true }).eq("id", recensione_id);
      return json({ blocked: true });
    }
    await supabase.from("recensioni").update({ blocked: false, flagged: false }).eq("id", recensione_id);
    return json({ unblocked: true });
  }

  return json({ error: "Azione non riconosciuta" }, 400);
});
