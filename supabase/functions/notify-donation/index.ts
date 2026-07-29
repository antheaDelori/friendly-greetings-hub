import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

// "Un lettore" ha donato / "Il lettore X" ha donato, nella lingua dell'autore
const DONATORE_DESC: Record<string, { anon: string; named: (n: string) => string }> = {
  it: { anon: "Un lettore", named: (n) => `Il lettore ${n}` },
  en: { anon: "A reader", named: (n) => `Reader ${n}` },
  de: { anon: "Ein Leser", named: (n) => `Der Leser ${n}` },
  es: { anon: "Un lector", named: (n) => `El lector ${n}` },
  fr: { anon: "Un lecteur", named: (n) => `Le lecteur ${n}` },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { author_id, author_name, book_id, book_titolo, book_slug, donatore_nome, anonimo } = await req.json();
  if (!author_id || !author_name) return new Response("Missing fields", { status: 400 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  await supabase.from("donazioni").insert({
    author_id,
    author_name,
    book_id: book_id ?? null,
    book_titolo: book_titolo ?? null,
    donatore_nome: anonimo ? null : (donatore_nome ?? null),
    anonimo: anonimo ?? true,
  });

  const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

  // Notifica interna all'admin (informativa, resta semplice)
  const adminRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
      to: ADMIN_EMAIL,
      subject: `DONAZIONE — ${author_name}${book_titolo ? ` («${book_titolo}»)` : ""}`,
      html: `<p>${anonimo === false && donatore_nome ? donatore_nome : "Un lettore"} ha avviato una donazione per <strong>${author_name}</strong>${book_titolo ? ` sull'opera «${book_titolo}»` : ""}.</p><p style="color:#888;font-size:12px;">Data: ${now}</p>`,
    }),
  });

  // Notifica all'autore, se troviamo la sua email
  const { data: { user: authorUser } } = await supabase.auth.admin.getUserById(author_id);
  if (authorUser?.email) {
    const meta = authorUser.user_metadata ?? {};
    const lingua = (meta.lingua as string) || "it";
    const desc = DONATORE_DESC[lingua] ?? DONATORE_DESC.it;
    const donatoreDesc = !anonimo && donatore_nome ? desc.named(donatore_nome) : desc.anon;

    let { data: template } = await supabase
      .from("email_templates")
      .select("oggetto, corpo_html")
      .eq("tipo", "donazione_lettore")
      .eq("lingua", lingua)
      .maybeSingle();

    if (!template) {
      const { data: fallback } = await supabase
        .from("email_templates")
        .select("oggetto, corpo_html")
        .eq("tipo", "donazione_lettore")
        .eq("lingua", "it")
        .maybeSingle();
      template = fallback;
    }

    if (template) {
      const authorNome = meta.pseudonimo || meta.nome || author_name;
      const linkLibro = book_slug ? `https://liberiamo2076.com/leggi/${book_slug}` : "https://liberiamo2076.com";
      const libroTitolo = book_titolo ?? "";

      const html = template.corpo_html
        .replaceAll("{{AUTORE_NOME}}", authorNome)
        .replaceAll("{{LIBRO_TITOLO}}", libroTitolo)
        .replaceAll("{{DONATORE_DESC}}", donatoreDesc)
        .replaceAll("{{LINK_LIBRO}}", linkLibro);

      const oggetto = template.oggetto.replaceAll("{{LIBRO_TITOLO}}", libroTitolo);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Liberiamo la mente <notifiche@liberiamo2076.com>",
          to: authorUser.email,
          bcc: ADMIN_EMAIL,
          subject: oggetto,
          html,
        }),
      });
    }
  }

  if (!adminRes.ok) {
    const err = await adminRes.text();
    return new Response(err, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
