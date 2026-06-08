import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { book_id, book_slug, book_titolo, reviewer_name, review_text } = await req.json();

  if (!book_id || !book_slug || !book_titolo || !reviewer_name || !review_text) {
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
  const authorNome = meta.pseudonimo || meta.nome || authorUser.email.split("@")[0];

  const { data: template } = await supabase
    .from("email_templates")
    .select("oggetto, corpo_html")
    .eq("tipo", "nuova_recensione")
    .eq("lingua", "it")
    .single();

  if (!template) return new Response("Template not found", { status: 500 });

  const estratto = review_text.length > 200
    ? review_text.slice(0, 200).trimEnd() + "…"
    : review_text;

  const linkLibro = `https://liberiamo2076.com/community/${book_slug}`;

  const html = template.corpo_html
    .replaceAll("{{AUTORE_NOME}}", authorNome)
    .replaceAll("{{LIBRO_TITOLO}}", book_titolo)
    .replaceAll("{{RECENSORE}}", reviewer_name)
    .replaceAll("{{ESTRATTO}}", estratto)
    .replaceAll("{{LINK_LIBRO}}", linkLibro);

  const oggetto = template.oggetto.replaceAll("{{LIBRO_TITOLO}}", book_titolo);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
      to: authorUser.email,
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
