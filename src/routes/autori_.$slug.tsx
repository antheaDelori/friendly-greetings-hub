import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { genres, ALL_GENRES, type Genre, type Book } from "@/data/books";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";

const searchSchema = z.object({
  genre: z.enum(["", "libro", "racconto", "saggio", "articolo", "novelle", "poesia", "fumetto", "illustrato"]).default(""),
  sort: z.enum(["letti", "recenti", "anno", "rating"]).default("recenti"),
});

type DbBook = {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string | null;
  genere: string;
  anno: number | null;
  letture: number;
  copertina_url: string | null;
  copertina_rotta_url: string | null;
  lastra_url: string | null;
  author_name: string | null;
  tag: string[] | null;
  collana_id: string | null;
};

function dbToBook(b: DbBook): Book {
  const author = b.author_name || "Autore";
  return {
    slug: b.slug,
    title: b.titolo,
    author,
    authorSlug: slugify(author),
    genere: (ALL_GENRES.includes(b.genere as Genre) ? b.genere : "libro") as Genre,
    year: b.anno ?? new Date().getFullYear(),
    reads: b.letture,
    rating: 0,
    cover: b.copertina_url ?? logo,
    coverRotta: b.copertina_rotta_url ?? undefined,
    lastra: b.lastra_url ?? undefined,
    tagline: b.descrizione?.slice(0, 140) ?? "",
    description: b.descrizione ?? "",
    chapters: [],
  };
}

function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
}

type CollanaCard = { id: string; slug: string; titolo: string; descrizione: string | null; copertina_url: string | null; count: number };

export const Route = createFileRoute("/autori_/$slug")({
  validateSearch: searchSchema,
  component: AutorePage,
});

function AutorePage() {
  const { t } = useTranslation();
  const { slug } = Route.useParams();
  const { genre, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/autori/$slug" });

  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [dbBooksRaw, setDbBooksRaw] = useState<DbBook[]>([]);
  const [collane, setCollane] = useState<CollanaCard[]>([]);
  const [showCollane, setShowCollane] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [libreriaMap, setLibreriaMap] = useState<Record<string, string>>({});

  type Search = z.infer<typeof searchSchema>;
  const setGenre = (val: Genre | "") =>
    navigate({ search: (prev: Search) => ({ ...prev, genre: val }), replace: true });
  const setSort = (val: "letti" | "recenti" | "anno" | "rating") =>
    navigate({ search: (prev: Search) => ({ ...prev, sort: val }), replace: true });

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      const { data: publicData } = await supabase
        .from("books")
        .select("id, slug, titolo, descrizione, genere, anno, letture, copertina_url, copertina_rotta_url, lastra_url, author_name, tag, collana_id")
        .eq("disponibile", true)
        .eq("accesso", "gratuito")
        .or("status.neq.open,status.is.null")
        .order("created_at", { ascending: false });

      const { data: { user } } = await supabase.auth.getUser();
      let privateData: DbBook[] = [];
      if (user && !user.is_anonymous && user.email) {
        const { data: accessRows } = await supabase
          .from("book_access_list")
          .select("book_id")
          .eq("email", user.email.toLowerCase());
        const authorizedIds = (accessRows ?? []).map((r: { book_id: string }) => r.book_id);
        if (authorizedIds.length > 0) {
          const { data: privBooks } = await supabase
            .from("books")
            .select("id, slug, titolo, descrizione, genere, anno, letture, copertina_url, copertina_rotta_url, lastra_url, author_name, tag, collana_id")
            .eq("disponibile", true)
            .in("id", authorizedIds)
            .or("status.neq.open,status.is.null")
            .order("created_at", { ascending: false });
          privateData = (privBooks ?? []) as DbBook[];
        }
      }

      const raw = [...(publicData ?? []), ...privateData] as DbBook[];
      const mine = raw.filter(b => slugify(b.author_name || "autore") === slug);
      setDbBooksRaw(mine);
      setAuthorName(mine[0]?.author_name || null);

      const collanaIds = [...new Set(mine.filter(b => b.collana_id).map(b => b.collana_id as string))];
      if (collanaIds.length > 0) {
        const { data: collaneData } = await supabase
          .from("collane")
          .select("id, slug, titolo, descrizione, copertina_url")
          .in("id", collanaIds);
        const counts: Record<string, number> = {};
        for (const b of raw) {
          if (b.collana_id && collanaIds.includes(b.collana_id)) counts[b.collana_id] = (counts[b.collana_id] ?? 0) + 1;
        }
        setCollane((collaneData ?? []).map(c => ({ ...c, count: counts[c.id] ?? 0 })));
      } else {
        setCollane([]);
      }

      setLoading(false);
    };
    fetchBooks();
  }, [slug]);

  useEffect(() => {
    const fetchAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) return;
      setIsLoggedIn(true);
      const { data: libData } = await supabase
        .from("libreria")
        .select("stato, books(slug)")
        .eq("user_id", user.id);
      const map: Record<string, string> = {};
      for (const entry of libData ?? []) {
        const bookSlug = (entry.books as unknown as { slug: string } | null)?.slug;
        if (bookSlug) map[bookSlug] = entry.stato;
      }
      setLibreriaMap(map);
    };
    fetchAuth();
  }, []);

  const handleLibreriaChange = async (bookSlug: string, stato: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const bookRaw = dbBooksRaw.find(b => b.slug === bookSlug);
    if (!bookRaw) return;
    if (stato === null) {
      await supabase.from("libreria").delete().eq("user_id", user.id).eq("book_id", bookRaw.id);
      setLibreriaMap(prev => { const next = { ...prev }; delete next[bookSlug]; return next; });
    } else if (libreriaMap[bookSlug]) {
      await supabase.from("libreria").update({ stato }).eq("user_id", user.id).eq("book_id", bookRaw.id);
      setLibreriaMap(prev => ({ ...prev, [bookSlug]: stato }));
    } else {
      await supabase.from("libreria").insert({ user_id: user.id, book_id: bookRaw.id, stato });
      setLibreriaMap(prev => ({ ...prev, [bookSlug]: stato }));
    }
  };

  // opere standalone dell'autore (le opere in collana si vedono dalla pagina della collana)
  const allBooks = useMemo(
    () => dbBooksRaw.filter(b => !b.collana_id).map(dbToBook),
    [dbBooksRaw]
  );

  const results = useMemo(() => {
    const filtered = allBooks.filter((b) => genre === "" || b.genere === genre);
    if (sort === "recenti") return filtered;
    return [...filtered].sort((a, b) => {
      if (sort === "letti") return b.reads - a.reads;
      if (sort === "anno") return a.year - b.year;
      return b.rating - a.rating;
    });
  }, [allBooks, genre, sort]);

  if (!loading && !authorName) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-24 flex-1 text-center">
          <div className="font-display text-7xl text-magenta">∅</div>
          <p className="mt-4 font-serif italic text-xl text-bone/70">{t("paginaAutore.nonTrovato")}</p>
          <Link to="/autori" className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all">
            ← {t("paginaAutore.tornaAutori")}
          </Link>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative scanlines overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-[500px] h-[500px] rounded-full bg-cyan/15 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// MODULE/AUTHOR</div>
            <Link to="/autori" className="font-mono text-[9px] uppercase tracking-widest text-bone/30 hover:text-cyan transition-colors">
              ← {t("paginaAutore.tornaAutori")}
            </Link>
          </div>
          {loading ? (
            <p className="mt-6 font-mono text-cyan text-sm animate-pulse">▸ {t("autoriPage.caricamento")}</p>
          ) : (
            <>
              <h1 className="mt-3 font-display text-5xl md:text-7xl leading-[0.95] text-bone tracking-tight">
                {authorName}<br />
                <span className="text-magenta text-glow-magenta">
                  {allBooks.length} {allBooks.length === 1 ? t("ui.operaSing") : t("ui.operePlur")} {t("paginaAutore.inBiblioteca")}
                </span>
              </h1>
              <p className="mt-6 font-serif italic text-xl text-bone/70 max-w-2xl">
                {t("paginaAutore.desc")}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Filtri compatti: generi su un'unica riga, sort sotto */}
      {!loading && (
        <section className="border-y border-cyan/15 bg-deep/40 backdrop-blur sticky top-[5.75rem] z-30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-4 flex flex-col gap-3">
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
                  ◆ {t(`generi.${g.value}`)}
                  {g.tooltip && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap border border-cyan/40 bg-void px-2 py-1 font-mono text-[8px] tracking-widest text-cyan opacity-0 transition-opacity group-hover:opacity-100 z-10">
                      {g.tooltip}
                    </span>
                  )}
                </button>
              ))}
              {collane.length > 0 && (
                <button
                  onClick={() => { setShowCollane(v => !v); setGenre(""); }}
                  className={`font-mono tracking-[0.22em] text-[10px] uppercase px-4 py-2 border transition-all ${
                    showCollane ? "border-magenta bg-magenta/15 text-magenta" : "border-magenta/30 text-bone/60 hover:border-magenta/60 hover:text-magenta"
                  }`}
                >
                  ◆ {t("catalogo.collaneBtn")}<span className={`ml-1 ${showCollane ? "text-magenta/70" : "text-bone/30"}`}>{collane.length}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono tracking-[0.22em] text-[10px] uppercase text-bone/50">sort:</span>
              {([
                ["recenti", t("catalogo.sortRecenti")],
                ["letti", t("catalogo.sortLetti")],
                ["rating", t("catalogo.sortRating")],
                ["anno", t("catalogo.sortAnno")],
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
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12 flex-1">
        {loading ? null : showCollane ? (
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
                  : <div className="w-16 h-20 flex-shrink-0 bg-void/60 border border-cyan/20 flex items-center justify-center font-display text-2xl text-bone/20">◊</div>}
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-bone tracking-tight leading-tight group-hover:text-cyan transition-colors">{c.titolo}</h3>
                  {c.descrizione && <p className="mt-1 font-serif text-sm text-bone/60 line-clamp-2">{c.descrizione}</p>}
                  <div className="mt-2 font-mono text-[9px] tracking-widest text-bone/30 uppercase">{c.count} {c.count === 1 ? t("ui.operaSing") : t("ui.operePlur")}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-24 glass p-12 hud-frame">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">{t("paginaAutore.nessunRisultato")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((b) => (
              <BookCard
                key={b.slug}
                book={b}
                isLoggedIn={isLoggedIn}
                libreriaStato={(libreriaMap[b.slug] as "da_leggere" | "in_lettura" | "letto") ?? null}
                onLibreriaChange={(stato) => handleLibreriaChange(b.slug, stato)}
              />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
