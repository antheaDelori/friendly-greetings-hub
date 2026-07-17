import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_LOGIN_EMAIL = Deno.env.get("ADMIN_LOGIN_EMAIL")!;

const RUNWAY_VERSION = "2024-11-06";

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

// Un solo controllo dello stato del task Runway — il polling (a intervalli)
// è responsabilità del chiamante (frontend), non di questa function, per
// restare ben sotto il limite di 150s delle edge function Supabase.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const { task_id, book_id, image_prompt, motion_prompt } = await req.json();
  if (!task_id || !book_id) return json({ error: "task_id e book_id richiesti" }, 400);

  // Verifica che il libro appartenga davvero a chi chiama
  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("id")
    .eq("id", book_id)
    .eq("author_id", user.id)
    .maybeSingle();
  if (bookErr || !book) return json({ error: "Libro non trovato" }, 404);

  const taskRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${task_id}`, {
    headers: {
      Authorization: `Bearer ${RUNWAY_API_KEY}`,
      "X-Runway-Version": RUNWAY_VERSION,
    },
  });
  if (!taskRes.ok) return json({ error: await taskRes.text() }, 502);
  const task = await taskRes.json();

  if (task.status === "FAILED") {
    return json({ status: "failed", error: task.failure ?? task.failureCode ?? "Errore sconosciuto" });
  }
  if (task.status !== "SUCCEEDED") {
    return json({ status: "pending" });
  }

  const videoSourceUrl = task.output?.[0];
  if (!videoSourceUrl) return json({ status: "failed", error: "Nessun video nella risposta Runway" });

  // Scarica il video finale e caricalo su Storage
  const videoFetchRes = await fetch(videoSourceUrl);
  if (!videoFetchRes.ok) return json({ status: "failed", error: "Impossibile scaricare il video generato" });
  const videoBytes = new Uint8Array(await videoFetchRes.arrayBuffer());

  const ts = Date.now();
  const videoPath = `video/${user.id}/${book_id}/${ts}.mp4`;
  const { error: uploadErr } = await supabase.storage
    .from("copertine")
    .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: false });
  if (uploadErr) return json({ status: "failed", error: uploadErr.message });

  const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(videoPath);
  const videoUrl = urlData.publicUrl;

  // Solo ora che la generazione è andata a buon fine: salva libro, log, credito.
  // Un errore tecnico nei passaggi precedenti NON deve consumare il credito —
  // è diverso da "il video non piace", che invece non dà diritto a rigenerare gratis.
  // video_captions azzerati: sono legati al vecchio video, non a quello nuovo appena generato.
  await supabase.from("books").update({ video_url: videoUrl, video_captions: null }).eq("id", book_id);
  await supabase.from("video_generation_attempts").insert({
    book_id,
    author_id: user.id,
    video_url: videoUrl,
    image_prompt: image_prompt ?? null,
    motion_prompt: motion_prompt ?? null,
  });

  const isAdmin = user.email?.toLowerCase() === ADMIN_LOGIN_EMAIL.toLowerCase();
  if (!isAdmin) {
    await supabase.rpc("decrement_video_crediti", { p_user_id: user.id });
  }

  return json({ status: "done", video_url: videoUrl });
});
