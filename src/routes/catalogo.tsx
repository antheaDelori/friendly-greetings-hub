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
      { name: "description", content: "Indice olografico delle opere. Cerca per titolo, autore o tema. Filtra per genere, ordina come preferisci." },
      { property: "og:title", content: "Catalogo — Liberiamo la mente" },
      { property: "og:description", content: "Tutte le opere indicizzate sulla biblioteca olografica." },
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
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative scanlines overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-[500px] h-[500px] rounded-full bg-cyan/15 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 relative">
          <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// MODULE/CATALOG</div>
          <h1 className="mt-3 font-display text-5xl md:text-7xl leading-[0.95] text-bone tracking-tight">
            Tutte le opere.<br /><span className="text-magenta text-glow-magenta">Una sola libreria.</span>
          </h1>
          <p className="mt-6 font-serif italic text-xl text-bone/70 max-w-2xl">
            Indice olografico in tempo reale. Cerca, filtra, scegli. Niente algoritmi che decidono per te.
          </p>

          {/* search */}
          <div className="mt-10 glass p-5 hud-frame">
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-cyan text-sm">▸</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="query: titolo, autore, tema..."
                className="w-full bg-transparent border-b border-cyan/30 focus:border-cyan outline-none py-3 pl-6 pr-32 font-mono text-lg text-bone placeholder:text-bone/30 transition-colors"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-widest text-cyan/70 uppercase">
                {results.length.toString().padStart(3, "0")} match
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filtri */}
      <section className="border-y border-cyan/15 bg-deep/40 backdrop-blur sticky top-[5.75rem] z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(g.value)}
                className={`font-mono tracking-[0.22em] text-[10px] uppercase px-4 py-2 border transition-all ${
                  genre === g.value
                    ? "border-cyan bg-cyan/15 text-cyan glow-cyan"
                    : "border-cyan/20 text-bone/60 hover:border-cyan/60 hover:text-cyan"
                }`}
              >
                ◆ {g.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono tracking-[0.22em] text-[10px] uppercase text-bone/50">sort:</span>
            {([
              ["letti", "Più letti"],
              ["recenti", "Più recenti"],
              ["rating", "Top rated"],
              ["anno", "Anno ↑"],
            ] as [Sort, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`font-mono tracking-[0.22em] text-[10px] uppercase px-2 py-1 transition-colors ${
                  sort === key ? "text-magenta border-b border-magenta" : "text-bone/50 hover:text-bone"
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
          <div className="text-center py-24 glass p-12 hud-frame">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">
              Nessuna opera nell'indice corrisponde alla query.
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-widest text-cyan/60 uppercase">
              ERR_404 / NO_MATCH_FOUND
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
