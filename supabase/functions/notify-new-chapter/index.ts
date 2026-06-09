import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { book_id, book_slug, book_titolo, chapter_numero, chapter_titolo } = await req.json();

  if (!book_id || !book_slug || !book_titolo || !chapter_numero || !chapter_titolo) {
    return new Response("Missing required fields", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: subscriptions } = await supabase
    .from("open_book_subscriptions")
    .select("user_id, notify_email")
    .eq("book_id", book_id)
    .eq("notify_email", true);

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ success: true, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const linkLibro = `https://liberiamo2076.com/libri-aperti/${book_slug}`;
  const errors: string[] = [];
  let sent = 0;

  for (const sub of subscriptions) {
    const { data: { user } } = await supabase.auth.admin.getUserById(sub.user_id);
    if (!user?.email) continue;

    const meta = user.user_metadata ?? {};
    const lettoreNome = meta.pseudonimo || meta.nome || user.email.split("@")[0];
    const lingua = meta.lingua || "it";

    const { data: template } = await supabase
      .from("email_templates")
      .select("oggetto, corpo_html")
      .eq("tipo", "nuovo_capitolo")
      .eq("lingua", lingua)
      .maybeSingle();

    const tpl = template ?? await supabase
      .from("email_templates")
      .select("oggetto, corpo_html")
      .eq("tipo", "nuovo_capitolo")
      .eq("lingua", "it")
      .single()
      .then((r) => r.data);

    if (!tpl) continue;

    const html = tpl.corpo_html
      .replaceAll("{{LETTORE_NOME}}", lettoreNome)
      .replaceAll("{{LIBRO_TITOLO}}", book_titolo)
      .replaceAll("{{CAPITOLO_NUMERO}}", String(chapter_numero))
      .replaceAll("{{CAPITOLO_TITOLO}}", chapter_titolo)
      .replaceAll("{{LINK_LIBRO}}", linkLibro);

    const oggetto = tpl.oggetto
      .replaceAll("{{LIBRO_TITOLO}}", book_titolo)
      .replaceAll("{{CAPITOLO_NUMERO}}", String(chapter_numero))
      .replaceAll("{{CAPITOLO_TITOLO}}", chapter_titolo);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
        to: user.email,
        subject: oggetto,
        html,
      }),
    });

    if (res.ok) {
      sent++;
    } else {
      errors.push(await res.text());
    }
  }

  return new Response(JSON.stringify({ success: true, sent, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
