import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { genres, ALL_GENRES, type Genre, type Book } from "@/data/books";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";

const searchSchema = z.object({
  q: z.string().default(""),
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
    authorSlug: author.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"),
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

export const Route = createFileRoute("/catalogo")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Catalogo — Liberiamo la mente" },
      { name: "description", content: "Indice olografico delle opere. Cerca per titolo, autore o tema. Filtra per genere, ordina come preferisci." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Liberiamo la mente" },
      { property: "og:url", content: "https://liberiamo2076.com/catalogo" },
      { property: "og:title", content: "Catalogo — Liberiamo la mente" },
      { property: "og:description", content: "Tutte le opere indicizzate sulla biblioteca olografica. Cerca, filtra, scegli." },
      { property: "og:image", content: "https://liberiamo2076.com/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Catalogo — Liberiamo la mente" },
      { name: "twitter:description", content: "Tutte le opere indicizzate sulla biblioteca olografica." },
      { name: "twitter:image", content: "https://liberiamo2076.com/og-image.png" },
    ],
  }),
  component: CatalogoPage,
});

type CollanaCard = { id: string; slug: string; titolo: string; descrizione: string | null; copertina_url: string | null; count: number };

function CatalogoPage() {
  const { t } = useTranslation();
  const { q, genre, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const [dbBooks, setDbBooks] = useState<Book[]>([]);
  const [dbBooksRaw, setDbBooksRaw] = useState<DbBook[]>([]);
  const [collane, setCollane] = useState<CollanaCard[]>([]);
  const [showCollane, setShowCollane] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [libreriaMap, setLibreriaMap] = useState<Record<string, string>>({});
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({});
  const [localQ, setLocalQ] = useState(q); // valore locale dell'input, inviato solo su submit
  const [guidaVisible, setGuidaVisible] = useState(() => localStorage.getItem("catalogo_guida_dismissed") !== "1");
  const searchRef = useRef<HTMLDivElement>(null);
  const userFilteredRef = useRef(false);

  const dismissGuida = () => { localStorage.setItem("catalogo_guida_dismissed", "1"); setGuidaVisible(false); };
  const openGuida = () => { localStorage.removeItem("catalogo_guida_dismissed"); setGuidaVisible(true); };

  const scrollToSearch = () => {
    const id = setTimeout(() => {
      if (!searchRef.current) return;
      const top = searchRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - 130, behavior: "smooth" });
    }, 50);
    return id;
  };

  // Scroll quando cambia genere/collane (click filtro)
  useEffect(() => {
    if (!userFilteredRef.current) return;
    userFilteredRef.current = false;
    const id = scrollToSearch();
    return () => clearTimeout(id);
  }, [genre, showCollane]);

  // Lancia la ricerca: aggiorna URL e scrolla
  const handleSearch = () => {
    setQ(localQ);
    scrollToSearch();
  };

  type Search = z.infer<typeof searchSchema>;
  const setQ = (val: string) =>
    navigate({ search: (prev: Search) => ({ ...prev, q: val }), replace: true });
  const setGenre = (val: Genre | "") =>
    navigate({ search: (prev: Search) => ({ ...prev, genre: val }), replace: true });
  const setSort = (val: "letti" | "recenti" | "anno" | "rating") =>
    navigate({ search: (prev: Search) => ({ ...prev, sort: val }), replace: true });

  useEffect(() => {
    const fetchBooks = async () => {
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
      setDbBooksRaw(raw);
      setDbBooks(raw.map(dbToBook));
      const tm: Record<string, string[]> = {};
      for (const b of raw) tm[b.slug] = b.tag ?? [];
      setTagsMap(tm);
    };
    const fetchAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) return;
      setUserId(user.id);
      setIsLoggedIn(true);
      const { data: libData } = await supabase
        .from("libreria")
        .select("stato, books(slug)")
        .eq("user_id", user.id);
      const map: Record<string, string> = {};
      for (const entry of libData ?? []) {
        const slug = (entry.books as unknown as { slug: string } | null)?.slug;
        if (slug) map[slug] = entry.stato;
      }
      setLibreriaMap(map);
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
    fetchAuth();
  }, []);

  const handleLibreriaChange = async (bookSlug: string, stato: string | null) => {
    if (!userId) return;
    const bookRaw = dbBooksRaw.find(b => b.slug === bookSlug);
    if (!bookRaw) return;
    if (stato === null) {
      await supabase.from("libreria").delete().eq("user_id", userId).eq("book_id", bookRaw.id);
      setLibreriaMap(prev => { const next = { ...prev }; delete next[bookSlug]; return next; });
    } else if (libreriaMap[bookSlug]) {
      await supabase.from("libreria").update({ stato }).eq("user_id", userId).eq("book_id", bookRaw.id);
      setLibreriaMap(prev => ({ ...prev, [bookSlug]: stato }));
    } else {
      await supabase.from("libreria").insert({ user_id: userId, book_id: bookRaw.id, stato });
      setLibreriaMap(prev => ({ ...prev, [bookSlug]: stato }));
    }
  };

  const allBooks = dbBooks;

  const results = useMemo(() => {
    const filtered = allBooks.filter((b) => {
      const matchesGenre = genre === "" || b.genere === genre;
      const text = q.trim().toLowerCase();
      const tags = tagsMap[b.slug] ?? [];
      const matchesQ =
        !text ||
        b.title.toLowerCase().includes(text) ||
        b.author.toLowerCase().includes(text) ||
        b.tagline.toLowerCase().includes(text) ||
        tags.some(t => t.toLowerCase().includes(text));
      const notInCollana = !dbBooksRaw.find(r => r.slug === b.slug)?.collana_id;
      return matchesGenre && matchesQ && notInCollana;
    });
    if (sort === "recenti") return filtered;
    return [...filtered].sort((a, b) => {
      if (sort === "letti") return b.reads - a.reads;
      if (sort === "anno") return a.year - b.year;
      return b.rating - a.rating;
    });
  }, [allBooks, q, genre, sort, tagsMap]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative scanlines overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-[500px] h-[500px] rounded-full bg-cyan/15 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 relative">
          <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// MODULE/CATALOG</div>
          <h1 className="mt-3 font-display text-5xl md:text-7xl leading-[0.95] text-bone tracking-tight">
            {t("catalogo.titolo")}<br /><span className="text-magenta text-glow-magenta">{t("catalogo.sottotitolo")}</span>
          </h1>
          <p className="mt-6 font-serif italic text-xl text-bone/70 max-w-2xl">
            {t("catalogo.desc")}
          </p>

          {/* search */}
          <div ref={searchRef} className="mt-10 glass p-5 hud-frame">
            <div className="relative flex items-center">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-cyan text-sm pointer-events-none">▸</span>
              <input
                value={localQ}
                onChange={(e) => setLocalQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder={t("catalogo.searchPlaceholder")}
                className="w-full bg-transparent border-b border-cyan/30 focus:border-cyan outline-none py-3 pl-6 pr-36 font-mono text-lg text-bone placeholder:text-bone/30 transition-colors"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
                {/* counter — aggiornato solo dopo ricerca */}
                {q && (
                  <span className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">
                    {results.length.toString().padStart(3, "0")} match
                  </span>
                )}
                {/* bottone cerca */}
                <button
                  onClick={handleSearch}
                  className="font-mono text-[11px] tracking-widest uppercase text-void bg-cyan px-3 py-1 hover:bg-magenta transition-colors"
                >
                  ▸ cerca
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guida catalogo */}
      {guidaVisible && (
        <section className="border-b border-cyan/15 bg-deep/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/60 uppercase">// guida_catalogo — come orientarsi</div>
              <button onClick={dismissGuida} className="font-mono text-[9px] tracking-widest text-bone/30 hover:text-bone/70 uppercase transition-colors flex-shrink-0">✕ chiudi</button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: "◉", label: "CERCA", desc: "Usa la barra sopra per trovare titoli, autori o argomenti. Premi INVIO o il tasto CERCA." },
                { icon: "◈", label: "FILTRA PER GENERE", desc: "Sotto la barra trovi i filtri: Libri, Articoli, Fumetti, Illustrati... Cliccane uno per restringere il catalogo." },
                { icon: "◆", label: "ORDINA", desc: "Scegli tra Più recenti, Più letti, Top rated o Anno di pubblicazione." },
                { icon: "▸", label: "LEGGI", desc: "Clicca su qualsiasi opera per aprirla. La lettura è sempre gratuita e completa — nessun estratto tagliato." },
                { icon: "◊", label: "COLLANE", desc: "Alcune opere fanno parte di serie tematiche. Usa il filtro COLLANE per leggerle nell'ordine dell'autore." },
                { icon: "✦", label: "VUOI FARE DI PIÙ?", desc: "Registrandoti puoi salvare segnalibri, lasciare recensioni e seguire gli autori che ami.", link: "/auth", linkLabel: "Registrati gratis →" },
              ].map(({ icon, label, desc, link, linkLabel }) => (
                <div key={label} className="flex gap-3 glass border border-cyan/10 p-4">
                  <span className="font-display text-xl text-cyan/40 flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.2em] text-cyan/70 uppercase mb-1">{label}</div>
                    <p className="font-serif text-sm text-bone/65 leading-relaxed">{desc}</p>
                    {link && <Link to={link} className="mt-2 inline-block font-mono text-[9px] tracking-widest text-magenta hover:text-magenta/70 uppercase">{linkLabel}</Link>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filtri */}
      <section className="border-y border-cyan/15 bg-deep/40 backdrop-blur sticky top-[5.75rem] z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g.value}
                  onClick={() => { userFilteredRef.current = true; setShowCollane(false); setGenre(genre === g.value ? "" : g.value); }}
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
            </div>
            <div className="border-t border-cyan/[0.08]" />
            <div>
              <button
                onClick={() => { userFilteredRef.current = true; setShowCollane(v => !v); setGenre(""); }}
                className={`font-mono tracking-[0.22em] text-[10px] uppercase px-4 py-2 border transition-all ${
                  showCollane ? "border-magenta bg-magenta/15 text-magenta" : "border-magenta/30 text-bone/60 hover:border-magenta/60 hover:text-magenta"
                }`}
              >
                ◆ {t("catalogo.collaneBtn")}{collane.length > 0 && <span className={`ml-1 ${showCollane ? "text-magenta/70" : "text-bone/30"}`}>{collane.length}</span>}
              </button>
            </div>
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
            {!guidaVisible && (
              <button
                onClick={openGuida}
                title="Apri guida catalogo"
                className="ml-2 font-mono text-[10px] tracking-widest border border-cyan/20 text-bone/40 hover:border-cyan/50 hover:text-cyan px-2 py-1 transition-colors"
              >
                ?
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12 flex-1">
        {showCollane ? (
          collane.length === 0 ? (
            <div className="text-center py-24 glass p-12 hud-frame">
              <div className="font-display text-7xl text-magenta">∅</div>
              <p className="mt-4 font-serif italic text-xl text-bone/70">{t("catalogo.nessunCollana")}</p>
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
                    <div className="font-mono text-[9px] tracking-widest text-magenta/70 uppercase">◆ {t("catalogo.collanaLabel")}</div>
                    <h3 className="mt-1 font-display text-lg text-bone tracking-tight leading-tight group-hover:text-cyan transition-colors">{c.titolo}</h3>
                    {c.descrizione && <p className="mt-1 font-serif italic text-sm text-bone/50 line-clamp-2">{c.descrizione}</p>}
                    <p className="mt-2 font-mono text-[9px] tracking-widest text-bone/30 uppercase">{c.count} {c.count === 1 ? t("ui.operaSing") : t("ui.operePlur")}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : results.length === 0 ? (
          <div className="text-center py-24 glass p-12 hud-frame">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">
              {t(q.trim() ? "catalogo.nessunRisultato" : (({
                libro: "catalogo.nessunLibro",
                racconto: "catalogo.nessunRacconto",
                saggio: "catalogo.nessunSaggio",
                articolo: "catalogo.nessunArticolo",
                novelle: "catalogo.nessunNovelle",
                poesia: "catalogo.nessunPoesia",
              } as Record<string, string>)[genre] ?? "catalogo.nessunGenere"))}
            </p>
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
