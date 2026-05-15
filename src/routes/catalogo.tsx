import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { books as staticBooks, genres, type Genre, type Book } from "@/data/books";

const ALL_GENRES: Genre[] = ["libro", "racconto", "saggio", "articolo", "buonanotte", "poesia"];
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";

const searchSchema = z.object({
  q: z.string().default(""),
  genre: z.enum(["", "libro", "racconto", "saggio", "articolo", "buonanotte", "poesia"]).default(""),
  sort: z.enum(["letti", "recenti", "anno", "rating"]).default("recenti"),
});

// Un solo placeholder fittizio (il terzo libro, inserito domani)
const PLACEHOLDER: Book[] = [staticBooks[2]];

type DbBook = {
  slug: string;
  titolo: string;
  descrizione: string | null;
  genere: string;
  anno: number | null;
  letture: number;
  copertina_url: string | null;
  lastra_url: string | null;
  author_name: string | null;
};

function dbToBook(b: DbBook): Book {
  const author = b.author_name || "Autore";
  return {
    slug: b.slug,
    title: b.titolo,
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
}

export const Route = createFileRoute("/catalogo")({
  validateSearch: searchSchema,
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

type CollanaCard = { id: string; slug: string; titolo: string; descrizione: string | null; copertina_url: string | null; count: number };

function CatalogoPage() {
  const { q, genre, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const [dbBooks, setDbBooks] = useState<Book[]>([]);
  const [collane, setCollane] = useState<CollanaCard[]>([]);
  const [showCollane, setShowCollane] = useState(false);

  type Search = z.infer<typeof searchSchema>;
  const setQ = (val: string) =>
    navigate({ search: (prev: Search) => ({ ...prev, q: val }), replace: true });
  const setGenre = (val: Genre | "") =>
    navigate({ search: (prev: Search) => ({ ...prev, genre: val }), replace: true });
  const setSort = (val: "letti" | "recenti" | "anno" | "rating") =>
    navigate({ search: (prev: Search) => ({ ...prev, sort: val }), replace: true });

  useEffect(() => {
    const fetchBooks = async () => {
      const { data } = await supabase
        .from("books")
        .select("slug, titolo, descrizione, genere, anno, letture, copertina_url, lastra_url, author_name")
        .eq("disponibile", true)
        .order("created_at", { ascending: false });
      setDbBooks((data ?? []).map(dbToBook));
    };
    const fetchCollane = async () => {
      const { data: collaneData } = await supabase
        .from("collane")
        .select("id, slug, titolo, descrizione, copertina_url")
        .order("created_at", { ascending: false });
      if (!collaneData) return;
      const { data: booksData } = await supabase
        .from("books")
        .select("collana_id")
        .eq("disponibile", true)
        .not("collana_id", "is", null);
      const counts: Record<string, number> = {};
      for (const b of booksData ?? []) {
        if (b.collana_id) counts[b.collana_id] = (counts[b.collana_id] ?? 0) + 1;
      }
      setCollane(collaneData.map(c => ({ ...c, count: counts[c.id] ?? 0 })));
    };
    fetchBooks();
    fetchCollane();
  }, []);

  const allBooks = useMemo(() => {
    const realSlugs = new Set(dbBooks.map(b => b.slug));
    return [...dbBooks, ...PLACEHOLDER.filter(b => !realSlugs.has(b.slug))];
  }, [dbBooks]);

  const results = useMemo(() => {
    const filtered = allBooks.filter((b) => {
      const matchesGenre = genre === "" || b.genre === genre;
      const text = q.trim().toLowerCase();
      const matchesQ =
        !text ||
        b.title.toLowerCase().includes(text) ||
        b.author.toLowerCase().includes(text) ||
        b.tagline.toLowerCase().includes(text);
      return matchesGenre && matchesQ;
    });
    if (sort === "recenti") return filtered;
    return [...filtered].sort((a, b) => {
      if (sort === "letti") return b.reads - a.reads;
      if (sort === "anno") return a.year - b.year;
      return b.rating - a.rating;
    });
  }, [allBooks, q, genre, sort]);

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
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g.value}
                  onClick={() => { setShowCollane(false); setGenre(genre === g.value ? "" : g.value); }}
                  className={`relative group font-mono tracking-[0.22em] text-[10px] uppercase px-4 py-2 border transition-all ${
                    genre === g.value
                      ? "border-cyan bg-cyan/15 text-cyan glow-cyan"
                      : "border-cyan/20 text-bone/60 hover:border-cyan/60 hover:text-cyan"
                  }`}
                >
                  ◆ {g.label}
                  {g.tooltip && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap border border-cyan/40 bg-void px-2 py-1 font-mono text-[8px] tracking-widest text-cyan opacity-0 transition-opacity group-hover:opacity-100 z-10">
                      {g.tooltip}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-cyan/[0.08]" />
            <div>
              <button
                onClick={() => { setShowCollane(v => !v); setGenre(""); }}
                className={`font-mono tracking-[0.22em] text-[10px] uppercase px-4 py-2 border transition-all ${
                  showCollane ? "border-magenta bg-magenta/15 text-magenta" : "border-magenta/30 text-bone/60 hover:border-magenta/60 hover:text-magenta"
                }`}
              >
                ◆ Collane{collane.length > 0 && <span className={`ml-1 ${showCollane ? "text-magenta/70" : "text-bone/30"}`}>{collane.length}</span>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono tracking-[0.22em] text-[10px] uppercase text-bone/50">sort:</span>
            {([
              ["recenti", "Più recenti"],
              ["letti", "Più letti"],
              ["rating", "Top rated"],
              ["anno", "Anno ↑"],
            ] as ["letti" | "recenti" | "anno" | "rating", string][]).map(([key, label]) => (
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
        {showCollane ? (
          collane.length === 0 ? (
            <div className="text-center py-24 glass p-12 hud-frame">
              <div className="font-display text-7xl text-magenta">∅</div>
              <p className="mt-4 font-serif italic text-xl text-bone/70">Nessuna collana ancora presente in archivio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {collane.map(c => (
                <Link key={c.id} to="/collane/$slug" params={{ slug: c.slug }}
                  className="group relative glass holo-hover hover:glow-cyan flex gap-4 p-5">
                  <span className="absolute top-1.5 left-1.5 w-3 h-3 border-l border-t border-cyan/70" />
                  <span className="absolute top-1.5 right-1.5 w-3 h-3 border-r border-t border-cyan/70" />
                  <span className="absolute bottom-1.5 left-1.5 w-3 h-3 border-l border-b border-cyan/70" />
                  <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-r border-b border-cyan/70" />
                  {c.copertina_url
                    ? <img src={c.copertina_url} alt={c.titolo} className="w-16 h-20 object-cover flex-shrink-0 ring-1 ring-cyan/30" />
                    : <div className="w-16 h-20 flex-shrink-0 bg-void/60 border border-cyan/20 flex items-center justify-center font-display text-2xl text-bone/20">◊</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[9px] tracking-widest text-magenta/70 uppercase">◆ collana</div>
                    <h3 className="mt-1 font-display text-lg text-bone tracking-tight leading-tight group-hover:text-cyan transition-colors">{c.titolo}</h3>
                    {c.descrizione && <p className="mt-1 font-serif italic text-sm text-bone/50 line-clamp-2">{c.descrizione}</p>}
                    <p className="mt-2 font-mono text-[9px] tracking-widest text-bone/30 uppercase">{c.count} {c.count === 1 ? "opera" : "opere"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : results.length === 0 ? (
          <div className="text-center py-24 glass p-12 hud-frame">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">
              {q.trim()
                ? "Nessuna opera corrisponde alla ricerca."
                : genre === "libro" ? "Nessun libro ancora presente in archivio."
                : genre === "racconto" ? "Nessun racconto ancora presente in archivio."
                : genre === "saggio" ? "Nessun saggio ancora presente in archivio."
                : genre === "articolo" ? "Nessun articolo ancora presente in archivio."
                : genre === "buonanotte" ? "Nessun racconto della sera ancora presente in archivio."
                : genre === "poesia" ? "Nessuna poesia ancora presente in archivio."
                : "Nessuna opera ancora presente in archivio."}
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
