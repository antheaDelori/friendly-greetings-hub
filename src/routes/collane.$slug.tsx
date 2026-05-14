import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { supabase } from "@/lib/supabase";
import type { Book, Genre } from "@/data/books";
import logo from "@/assets/logo-liberiamo.jpg";

export const Route = createFileRoute("/collane/$slug")({
  component: CollanePage,
});

const ALL_GENRES: Genre[] = ["libro", "racconto", "saggio", "articolo", "buonanotte", "poesia"];

function CollanePage() {
  const { slug } = Route.useParams();
  const [collana, setCollana] = useState<{ id: string; titolo: string; descrizione: string | null; copertina_url: string | null } | null>(null);
  const [libri, setLibri] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: collanaData } = await supabase
        .from("collane")
        .select("id, titolo, descrizione, copertina_url")
        .eq("slug", slug)
        .maybeSingle();

      if (!collanaData) { setNotFound(true); setLoading(false); return; }
      setCollana(collanaData);

      const { data: booksData } = await supabase
        .from("books")
        .select("slug, titolo, sottotitolo, descrizione, genere, anno, letture, copertina_url, lastra_url, author_name")
        .eq("collana_id", collanaData.id)
        .eq("disponibile", true)
        .order("created_at", { ascending: true });

      if (booksData) {
        setLibri(booksData.map(b => {
          const author = b.author_name || "Autore";
          return {
            slug: b.slug,
            title: b.sottotitolo || b.titolo,
            author,
            authorSlug: author.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"),
            genre: (ALL_GENRES.includes(b.genere as Genre) ? b.genere : "libro") as Genre,
            year: b.anno ?? new Date().getFullYear(),
            reads: b.letture,
            rating: 0,
            cover: b.copertina_url ?? logo,
            lastra: b.lastra_url ?? undefined,
            tagline: b.descrizione?.slice(0, 140) ?? "",
            description: b.descrizione ?? "",
            chapters: [],
          };
        }));
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento...</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !collana) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">Collana non trovata.</p>
            <Link to="/catalogo" className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-cyan border-b border-cyan/60 pb-1">
              ▸ Torna al catalogo
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero collana */}
      <section className="relative overflow-hidden scanlines">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-cyan/10 blur-[100px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 relative">
          <Link to="/catalogo" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-bone/40 hover:text-cyan transition-colors mb-8">
            ← Catalogo
          </Link>
          <div className="flex flex-col md:flex-row gap-10 items-start">
            {collana.copertina_url ? (
              <img src={collana.copertina_url} alt={collana.titolo}
                className="w-48 md:w-56 flex-shrink-0 object-cover ring-1 ring-cyan/30 hud-frame" />
            ) : (
              <div className="w-48 md:w-56 aspect-[3/4] flex-shrink-0 bg-void/60 border border-cyan/20 flex items-center justify-center font-display text-6xl text-bone/20 hud-frame">◊</div>
            )}
            <div className="flex-1">
              <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// collana</div>
              <h1 className="mt-3 font-display text-4xl md:text-6xl text-bone tracking-tight leading-none">
                {collana.titolo}
              </h1>
              {collana.descrizione && (
                <p className="mt-5 font-serif italic text-xl text-bone/70 max-w-2xl leading-relaxed">
                  {collana.descrizione}
                </p>
              )}
              <p className="mt-4 font-mono text-[10px] tracking-widest text-bone/30 uppercase">
                {libri.length} {libri.length === 1 ? "opera" : "opere"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Griglia opere */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 flex-1">
        {libri.length === 0 ? (
          <div className="text-center py-16 glass hud-frame p-12">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">Nessuna opera ancora in questa collana.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {libri.map(b => <BookCard key={b.slug} book={b} compact />)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
