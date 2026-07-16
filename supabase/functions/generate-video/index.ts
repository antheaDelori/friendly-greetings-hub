import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

const RUNWAY_VERSION = "2024-11-06";
const VIDEO_DURATION = 10; // secondi — v1: solo 10", nessuna unione di spezzoni
const VIDEO_RATIO = "1280:720";

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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function pollRunwayTask(taskId: string, maxAttempts = 40): Promise<{ output: string[] }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        "X-Runway-Version": RUNWAY_VERSION,
      },
    });
    const task = await res.json();
    if (task.status === "SUCCEEDED") return task;
    if (task.status === "FAILED") {
      throw new Error(`Runway: ${task.failure ?? task.failureCode ?? "errore sconosciuto"}`);
    }
  }
  throw new Error("Timeout: generazione video troppo lenta (>2 min)");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const { book_id } = await req.json();
  if (!book_id) return json({ error: "book_id richiesto" }, 400);

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // ── Entitlement: admin illimitato, altrimenti abbonamento attivo + crediti ──
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("abbonamento_attivo, video_crediti")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.abbonamento_attivo || (profile.video_crediti ?? 0) <= 0) {
      return json({ error: "no_credits" }, 403);
    }
  }

  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("titolo, descrizione, author_name")
    .eq("id", book_id)
    .eq("author_id", user.id)
    .maybeSingle();
  if (bookErr || !book) return json({ error: "Libro non trovato" }, 404);
  if (!book.descrizione?.trim()) return json({ error: "Il libro non ha una descrizione da cui generare il video" }, 400);

  // 1. GPT-4o: descrizione → prompt immagine (fotogramma) + prompt movimento
  let imagePrompt = book.descrizione;
  let motionPrompt = "Slow, subtle cinematic camera movement, atmospheric.";
  try {
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              `You are a cinematic art director creating a 10-second promotional teaser video for a book. ` +
              `From the book description, produce exactly two lines, no explanations: ` +
              `IMAGE: a single, powerful, photorealistic scene that captures the book's soul — one clear subject, ` +
              `specific dramatic lighting, rich color palette, cinematic photography, 8K detail. Max 100 words. ` +
              `MOTION: a short camera/motion instruction for animating that exact image (e.g. slow push-in, gentle pan, ` +
              `drifting particles, rippling water) — subtle and atmospheric, not chaotic. Max 30 words.`,
          },
          {
            role: "user",
            content: `Title: "${book.titolo ?? ""}"\nAuthor: "${book.author_name ?? ""}"\nDescription: ${book.descrizione}`,
          },
        ],
      }),
    });
    if (gptRes.ok) {
      const gptData = await gptRes.json();
      const text: string = gptData.choices?.[0]?.message?.content?.trim() ?? "";
      const imgMatch = text.match(/IMAGE:\s*(.+?)(?=\nMOTION:|$)/is);
      const motionMatch = text.match(/MOTION:\s*(.+)/is);
      if (imgMatch?.[1]) imagePrompt = imgMatch[1].trim();
      if (motionMatch?.[1]) motionPrompt = motionMatch[1].trim();
    }
  } catch (_) { /* fallback: usa la descrizione grezza */ }

  // 2. gpt-image-1: genera il fotogramma di partenza
  const imgFormData = new FormData();
  imgFormData.append("model", "gpt-image-1");
  imgFormData.append(
    "prompt",
    `Photorealistic cinematic still frame for a book promotional video. NOT painted or illustrated, NOT a book cover, ` +
    `no text or typography anywhere in the image. Full bleed, sharp focus, dramatic cinematic lighting. ` +
    `SCENE: ${imagePrompt}`,
  );
  imgFormData.append("size", "1536x1024");
  imgFormData.append("quality", "high");
  imgFormData.append("n", "1");

  const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: imgFormData,
  });
  if (!imgRes.ok) return json({ error: await imgRes.text() }, 502);

  const imgData = await imgRes.json();
  let keyframeBytes: Uint8Array;
  if (imgData.data[0].b64_json) {
    keyframeBytes = Uint8Array.from(atob(imgData.data[0].b64_json), (c) => c.charCodeAt(0));
  } else if (imgData.data[0].url) {
    const fetchRes = await fetch(imgData.data[0].url);
    keyframeBytes = new Uint8Array(await fetchRes.arrayBuffer());
  } else {
    return json({ error: "Nessun dato immagine nella risposta AI" }, 502);
  }

  // 3. Runway Gen-4.5 image-to-video — il fotogramma va come data URI, niente
  //    round-trip di upload/pubblicazione intermedio su Storage.
  const promptImage = `data:image/png;base64,${bytesToBase64(keyframeBytes)}`;

  const createRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RUNWAY_API_KEY}`,
      "X-Runway-Version": RUNWAY_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gen4.5",
      promptImage,
      promptText: motionPrompt,
      ratio: VIDEO_RATIO,
      duration: VIDEO_DURATION,
    }),
  });
  if (!createRes.ok) return json({ error: await createRes.text() }, 502);
  const createData = await createRes.json();
  const taskId = createData.id;
  if (!taskId) return json({ error: "Runway non ha restituito un task id" }, 502);

  let task: { output: string[] };
  try {
    task = await pollRunwayTask(taskId);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Errore generazione video" }, 502);
  }

  const videoSourceUrl = task.output?.[0];
  if (!videoSourceUrl) return json({ error: "Nessun video nella risposta Runway" }, 502);

  // 4. Scarica il video finale e caricalo su Storage
  const videoFetchRes = await fetch(videoSourceUrl);
  if (!videoFetchRes.ok) return json({ error: "Impossibile scaricare il video generato" }, 502);
  const videoBytes = new Uint8Array(await videoFetchRes.arrayBuffer());

  const ts = Date.now();
  const videoPath = `video/${user.id}/${book_id}/${ts}.mp4`;
  const { error: uploadErr } = await supabase.storage
    .from("copertine")
    .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: false });
  if (uploadErr) return json({ error: uploadErr.message }, 500);

  const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(videoPath);
  const videoUrl = urlData.publicUrl;

  // 5. Solo ora che la generazione è andata a buon fine: salva libro, log, credito.
  //    Un errore tecnico nei passaggi precedenti NON deve consumare il credito —
  //    è diverso da "il video non piace", che invece non dà diritto a rigenerare gratis.
  await supabase.from("books").update({ video_url: videoUrl }).eq("id", book_id);
  await supabase.from("video_generation_attempts").insert({
    book_id,
    author_id: user.id,
    video_url: videoUrl,
    image_prompt: imagePrompt,
    motion_prompt: motionPrompt,
  });
  if (!isAdmin) {
    await supabase.rpc("decrement_video_crediti", { p_user_id: user.id });
  }

  return json({ video_url: videoUrl });
});
