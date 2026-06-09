import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/libri-aperti/")({
  head: () => ({
    meta: [
      { title: "Libri Aperti — Liberiamo la mente" },
      { name: "description", content: "Opere scritte in tempo reale. Segui un libro mentre nasce, capitolo per capitolo." },
    ],
  }),
  component: LibriApertiPage,
});

type OpenBook = {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string | null;
  genere: string;
  author_name: string | null;
  copertina_url: string | null;
  chapterCount: number;
};

function LibriApertiPage() {
  const { t } = useTranslation();
  const [books, setBooks] = useState<OpenBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("books")
        .select("id, slug, titolo, descrizione, genere, author_name, copertina_url")
        .eq("status", "open")
        .eq("disponibile", true)
        .eq("cestinato", false)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const booksWithCounts = await Promise.all(
        data.map(async (b) => {
          const { count } = await supabase
            .from("open_book_chapters")
            .select("id", { count: "exact", head: true })
            .eq("book_id", b.id);
          return { ...b, chapterCount: count ?? 0 };
        })
      );

      setBooks(booksWithCounts);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <SiteHeader />
      <PageShell title="Libri Aperti">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16">
          <div className="mb-12">
            <p className="font-mono text-[10px] tracking-[0.3em] text-cyan/60 uppercase mb-3">// sezione_speciale</p>
            <h1 className="font-display text-4xl sm:text-5xl text-bone mb-3">
              {t("libriAperti.titolo")}
            </h1>
            <p className="font-mono text-[11px] tracking-widest text-cyan/50 uppercase mb-4">{t("libriAperti.sottotitolo")}</p>
            <p className="text-bone/60 text-sm leading-relaxed max-w-2xl">{t("libriAperti.desc")}</p>
          </div>

          {loading ? (
            <p className="font-mono text-[11px] tracking-widest text-bone/40 animate-pulse uppercase">{t("libriAperti.caricamento")}</p>
          ) : books.length === 0 ? (
            <p className="font-mono text-[11px] tracking-widest text-bone/40 uppercase">{t("libriAperti.nessunLibro")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <Link
                  key={book.id}
                  to="/libri-aperti/$slug"
                  params={{ slug: book.slug }}
                  className="group block glass border border-cyan/15 hover:border-cyan/40 transition-all duration-200 overflow-hidden"
                >
                  <div className="relative aspect-[2/3] bg-deep/60 overflow-hidden">
                    {book.copertina_url ? (
                      <img
                        src={book.copertina_url}
                        alt={book.titolo}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center">
                        <p className="font-mono text-[9px] tracking-widest text-bone/30 uppercase leading-relaxed">
                          {t("libriAperti.copertinaNonDisponibile")}
                        </p>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="font-mono text-[8px] tracking-widest uppercase bg-cyan/20 border border-cyan/40 text-cyan px-2 py-0.5">
                        {t("libriAperti.badgeInScrittura")}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-[9px] tracking-widest text-bone/40 uppercase mb-1">{book.author_name ?? "—"}</p>
                    <h2 className="font-serif text-bone text-base leading-snug mb-2 group-hover:text-cyan transition-colors line-clamp-2">
                      {book.titolo}
                    </h2>
                    <p className="font-mono text-[9px] tracking-widest text-bone/35 uppercase">
                      {book.chapterCount} {book.chapterCount === 1 ? t("libriAperti.capitoloSing") : t("libriAperti.capitoloPlur")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PageShell>
      <SiteFooter />
    </>
  );
}
