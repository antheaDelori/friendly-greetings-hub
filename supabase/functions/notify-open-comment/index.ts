import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { book_id, book_titolo, chapter_titolo, commenter_name, comment_text } = await req.json();

  if (!book_id || !book_titolo || !chapter_titolo || !commenter_name || !comment_text) {
    return new Response("Missing required fields", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: book } = await supabase
    .from("books")
    .select("author_id")
    .eq("id", book_id)
    .single();

  if (!book?.author_id) return new Response("Book or author not found", { status: 404 });

  const { data: { user: authorUser } } = await supabase.auth.admin.getUserById(book.author_id);
  if (!authorUser?.email) return new Response("Author email not found", { status: 404 });

  const meta = authorUser.user_metadata ?? {};
  const autoreNome = meta.pseudonimo || meta.nome || authorUser.email.split("@")[0];
  const lingua = meta.lingua || "it";

  const { data: template } = await supabase
    .from("email_templates")
    .select("oggetto, corpo_html")
    .eq("tipo", "nuovo_commento_aperto")
    .eq("lingua", lingua)
    .maybeSingle();

  const tpl = template ?? await supabase
    .from("email_templates")
    .select("oggetto, corpo_html")
    .eq("tipo", "nuovo_commento_aperto")
    .eq("lingua", "it")
    .single()
    .then((r) => r.data);

  if (!tpl) return new Response("Template not found", { status: 500 });

  const estratto = comment_text.length > 200
    ? comment_text.slice(0, 200).trimEnd() + "…"
    : comment_text;

  const linkGestione = `https://liberiamo2076.com/area-autore`;

  const html = tpl.corpo_html
    .replaceAll("{{AUTORE_NOME}}", autoreNome)
    .replaceAll("{{LIBRO_TITOLO}}", book_titolo)
    .replaceAll("{{CAPITOLO_TITOLO}}", chapter_titolo)
    .replaceAll("{{COMMENTATORE}}", commenter_name)
    .replaceAll("{{ESTRATTO}}", estratto)
    .replaceAll("{{LINK_GESTIONE}}", linkGestione);

  const oggetto = tpl.oggetto
    .replaceAll("{{LIBRO_TITOLO}}", book_titolo);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
      to: authorUser.email,
      bcc: ADMIN_EMAIL,
      subject: oggetto,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
