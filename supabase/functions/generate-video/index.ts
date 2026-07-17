import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_LOGIN_EMAIL = Deno.env.get("ADMIN_LOGIN_EMAIL")!;

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

  const isAdmin = user.email?.toLowerCase() === ADMIN_LOGIN_EMAIL.toLowerCase();

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
              `IMAGE: a single, powerful, photorealistic scene that captures the book's soul. ` +
              `If the description involves characters, they MUST be visibly present and doing something specific in the ` +
              `frame — never an empty landscape or object alone, even as a small silhouette against a vast backdrop. ` +
              `Use scale and composition to convey the story's emotional core (isolation, danger, wonder, whatever fits): ` +
              `e.g. tiny figures against an immense, desolate expanse reads as apocalyptic/hopeless far better than a ` +
              `single object in isolation. Specific dramatic lighting, rich color palette, cinematic photography, 8K detail. Max 100 words. ` +
              `MOTION: describe what actually MOVES in the 10 seconds — prioritize the characters' physical action ` +
              `(walking, struggling, dragging, reaching, falling) over generic camera moves. A subtle camera move ` +
              `(slow push-in, slow pull-back to reveal scale) can combine with that action but must not replace it. Max 40 words.`,
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
      // GPT a volte aggiunge markdown (**IMAGE:** invece di IMAGE:) nonostante
      // le istruzioni — il lookahead ignora eventuali asterischi/spazi extra.
      const imgMatch = text.match(/\**\s*IMAGE:\s*\**\s*(.+?)(?=\**\s*MOTION:|$)/is);
      const motionMatch = text.match(/\**\s*MOTION:\s*\**\s*(.+)/is);
      if (imgMatch?.[1]) imagePrompt = imgMatch[1].replace(/\*+\s*$/, "").trim();
      if (motionMatch?.[1]) motionPrompt = motionMatch[1].replace(/\*+\s*$/, "").trim();
    }
  } catch (_) { /* fallback: usa la descrizione grezza */ }

  // 2. gpt-image-1: genera il fotogramma di partenza
  //    (images/generations vuole JSON, a differenza di images/edits che
  //    richiede multipart per via del file immagine di riferimento)
  const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt:
        `Photorealistic cinematic still frame for a book promotional video. NOT painted or illustrated, NOT a book cover, ` +
        `no text or typography anywhere in the image. Full bleed, sharp focus, dramatic cinematic lighting. ` +
        `SCENE: ${imagePrompt}`,
      size: "1536x1024",
      quality: "high",
      n: 1,
    }),
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

  // Le edge function Supabase hanno un limite fisso di 150s (idle timeout) —
  // Runway può impiegare più di così. Sottomettiamo il task e rispondiamo
  // subito: il frontend interroga check-video-status a intervalli finché
  // non è pronto, invece di restare bloccato su questa chiamata.
  return json({ task_id: taskId, image_prompt: imagePrompt, motion_prompt: motionPrompt });
});
