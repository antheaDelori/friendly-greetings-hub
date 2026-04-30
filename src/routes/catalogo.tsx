import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { books, genres, type Genre } from "@/data/books";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catalogo — Liberiamo la mente" },
      { name: "description", content: "Esplora libri, racconti, saggi e articoli pubblicati dagli autori indipendenti di Liberiamo la mente. Cerca per titolo, autore o genere." },
      { property: "og:title", content: "Catalogo — Liberiamo la mente" },
      { property: "og:description", content: "Tutte le opere pubblicate sulla piattaforma. Filtra per genere, ordina per più letti, più recenti o anno." },
    ],
  }),
  component: CatalogoPage,
});

type Sort = "letti" | "recenti" | "anno" | "rating";

function CatalogoPage() {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<Genre | "tutti">("tutti");
  const [sort, setSort] = useState<Sort>("letti");

  const results = useMemo(() => {
    const filtered = books.filter((b) => {
      const matchesGenre = genre === "tutti" || b.genre === genre;
      const text = q.trim().toLowerCase();
      const matchesQ =
        !text ||
        b.title.toLowerCase().includes(text) ||
        b.author.toLowerCase().includes(text) ||
        b.tagline.toLowerCase().includes(text);
      return matchesGenre && matchesQ;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "letti") return b.reads - a.reads;
      if (sort === "recenti") return b.year - a.year;
      if (sort === "anno") return a.year - b.year;
      return b.rating - a.rating;
    });
  }, [q, genre, sort]);

  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <SiteHeader />

      <section className="ink-texture text-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16">
          <div className="font-display tracking-[0.25em] text-xs text-gold">— catalogo</div>
          <h1 className="mt-3 font-display text-6xl md:text-7xl leading-none">
            Tutte le opere.<br /><span className="text-blood">Una sola libreria.</span>
          </h1>
          <p className="mt-6 font-serif text-xl text-paper/75 max-w-2xl">
            Cerca per titolo, autore o tema. Filtra per genere. Ordina come preferisci.
          </p>

          {/* Search */}
          <div className="mt-10 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca un titolo, un autore, un'idea..."
                className="w-full bg-transparent border-b-2 border-paper/30 focus:border-blood outline-none py-3 pl-0 pr-10 font-serif text-lg text-paper placeholder:text-paper/40 transition-colors"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 font-display text-xs tracking-widest text-paper/50">
                {results.length} risultati
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filtri */}
      <section className="border-b border-ink/10 bg-paper sticky top-16 z-30 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(g.value)}
                className={`font-display tracking-widest text-[11px] uppercase px-4 py-2 transition-colors ${
                  genre === g.value
                    ? "bg-ink text-paper"
                    : "bg-transparent text-ink hover:bg-ink/10"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display tracking-widest text-[11px] uppercase text-ink/60">Ordina:</span>
            {([
              ["letti", "Più letti"],
              ["recenti", "Più recenti"],
              ["rating", "Top rated"],
              ["anno", "Anno ↑"],
            ] as [Sort, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`font-display tracking-widest text-[11px] uppercase px-3 py-2 transition-colors ${
                  sort === key ? "text-blood border-b-2 border-blood" : "text-ink/60 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12 flex-1">
        {results.length === 0 ? (
          <div className="text-center py-24">
            <div className="font-display text-7xl text-blood">∅</div>
            <p className="mt-4 font-serif text-xl text-ink/70">
              Nessuna opera corrisponde alla tua ricerca.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((b) => <BookCard key={b.slug} book={b} />)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
