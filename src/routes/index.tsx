import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import { getCestinoTranslation } from "@/lib/cestinoI18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { type Book, type Genre } from "@/data/books";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/liberiamo-hero.webp";
import logoFallback from "@/assets/logo-liberiamo.jpg";

const FEATURED_GENRES: Genre[] = ["libro", "racconto", "saggio", "poesia"];

function pickFeatured(all: Book[]): Book[] {
  const byGenre: Partial<Record<Genre, Book[]>> = {};
  for (const b of all) {
    (byGenre[b.genre] ??= []).push(b);
  }
  const result: Book[] = [];
  let round = 0;
  while (result.length < 4) {
    let added = false;
    for (const g of FEATURED_GENRES) {
      if (result.length >= 4) break;
      if ((byGenre[g]?.length ?? 0) > round) {
        result.push(byGenre[g]![round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return result;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liberiamo la mente — Read or Perish" },
      { name: "description", content: "Biblioteca olografica indipendente. Libri, racconti, saggi e articoli pubblicati direttamente dagli autori. Read or perish." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const [featured, setFeatured] = useState<Book[]>([]);
  const [fresh, setFresh] = useState<Book[]>([]);
  const [cestinoTooltip, setCestinoTooltip] = useState<string | null>(null);
  useEffect(() => { setCestinoTooltip(getCestinoTranslation()); }, []);
  const [freshPage, setFreshPage] = useState(0);
  const FRESH_PER_PAGE = 8;
  const freshTotalPages = Math.max(1, Math.ceil(fresh.length / FRESH_PER_PAGE));
  const freshVisible = fresh.slice(freshPage * FRESH_PER_PAGE, (freshPage + 1) * FRESH_PER_PAGE);
  const [totals, setTotals] = useState({ opere: 0, autori: 0, letture: 0 });
  const [isAuthor, setIsAuthor] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuthor = async (userId: string) => {
      const { data } = await supabase.from("author_profiles").select("id").eq("id", userId).maybeSingle();
      setIsAuthor(!!data);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user && !user.is_anonymous) { setIsLoggedIn(true); checkAuthor(user.id); }
      else { setIsLoggedIn(false); setIsAuthor(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const ALL_GENRES: Genre[] = ["libro", "racconto", "saggio", "articolo", "novelle", "poesia"];

      // Libri pubblici (gratuito)
      const { data: publicData } = await supabase
        .from("books")
        .select("slug, titolo, descrizione, genere, anno, letture, copertina_url, lastra_url, author_name, accesso, created_at")
        .eq("disponibile", true)
        .eq("accesso", "gratuito")
        .order("created_at", { ascending: false });

      // Libri riservati/premium accessibili all'utente corrente
      let privateData: typeof publicData = [];
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.is_anonymous && user.email) {
        const { data: accessRows } = await supabase
          .from("book_access_list")
          .select("book_id")
          .eq("email", user.email);
        const authorizedIds = (accessRows ?? []).map((r: { book_id: string }) => r.book_id);
        if (authorizedIds.length > 0) {
          const { data: privBooks } = await supabase
            .from("books")
            .select("slug, titolo, descrizione, genere, anno, letture, copertina_url, lastra_url, author_name, accesso, created_at")
            .eq("disponibile", true)
            .in("id", authorizedIds)
            .order("created_at", { ascending: false });
          privateData = privBooks ?? [];
        }
      }

      // Unisce e riordina per data
      const data = [...(publicData ?? []), ...privateData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (data && data.length > 0) {
        const dbBooks: Book[] = data.map(b => {
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
            cover: b.copertina_url ?? logoFallback,
            lastra: b.lastra_url ?? undefined,
            tagline: b.descrizione?.slice(0, 140) ?? "",
            description: b.descrizione ?? "",
            chapters: [],
          };
        });
        setFeatured(pickFeatured(dbBooks));
        setFresh(dbBooks);
        setFreshPage(0);

        const totalLetture = data.reduce((s: number, b: { letture: number }) => s + (b.letture ?? 0), 0);
        const uniqueAuthors = new Set(data.map((b: { author_name: string | null }) => b.author_name).filter(Boolean)).size;
        setTotals({ opere: data.length, autori: uniqueAuthors, letture: totalLetture });
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden scanlines">
        {/* glow ambient */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-magenta/10 blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-10 md:py-16 grid lg:grid-cols-12 gap-10 items-start relative">
          <div className="lg:col-span-7 fade-up">
            <div className="inline-flex items-center gap-3 border border-cyan/40 bg-cyan/5 px-3 py-1.5 font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">
              <span className="h-1.5 w-1.5 bg-cyan rounded-full animate-pulse" />
              SYS // il mondo dei creativi · 2076
            </div>
            <h1 className="mt-6 font-display text-[clamp(3.5rem,9vw,8.5rem)] leading-[0.88] tracking-tight text-bone">
              <span className="block">READ</span>
              <span className="block"><span className="text-magenta text-glow-magenta">OR</span> PERISH<span className="text-cyan text-glow-cyan">.</span></span>
            </h1>
            <p className="mt-3 font-mono text-[10px] tracking-widest text-bone/55 uppercase">
              biblioteca digitale · rete olografica · anno 2076
            </p>
            <p className="mt-6 font-serif text-xl md:text-2xl text-bone/75 max-w-xl leading-relaxed italic">
              <Trans
                i18nKey="home.heroDesc"
                components={{ keyword: <span className="text-cyan not-italic font-mono text-base tracking-widest" /> }}
              />
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/catalogo"
                className="group relative inline-flex items-center gap-3 border border-cyan/70 bg-cyan/15 px-7 py-4 font-mono tracking-[0.22em] text-xs uppercase text-cyan hover:bg-cyan hover:text-void hover:glow-cyan transition-all hud-frame"
              >
                ▸ {t("home.esploraBtn")}
              </Link>
              {isAuthor ? (
                <span className="inline-flex items-center gap-3 border border-magenta/60 bg-magenta/10 px-7 py-4 font-mono tracking-[0.22em] text-xs uppercase text-magenta cursor-default select-none">
                  ◆ {t("home.autoreBtnGiaAutore", "Sei un autore")}
                </span>
              ) : (
                <Link
                  to={isLoggedIn ? "/auth/profilo-autore" : "/auth/registrazione"} search={isLoggedIn ? undefined : { autore: true }}
                  className="inline-flex items-center gap-3 border border-magenta/60 bg-magenta/10 px-7 py-4 font-mono tracking-[0.22em] text-xs uppercase text-magenta hover:bg-magenta hover:text-void hover:glow-magenta transition-all"
                >
                  ◆ {t("home.divAutoreBtn")}
                </Link>
              )}
            </div>

            <dl className="mt-16 grid grid-cols-3 gap-4 max-w-2xl">
              {[
                { k: "opere", v: totals.opere, label: t("home.opereLabel"), c: "text-cyan" },
                { k: "autori", v: totals.autori, label: t("home.autoriLabel"), c: "text-magenta" },
                { k: "letture", v: totals.letture, label: t("home.lettureLabel"), c: "text-amber" },
              ].map((s) => (
                <div key={s.k} className="glass p-4 hud-frame">
                  <dt className={`font-display text-3xl md:text-4xl ${s.c}`}>
                    {s.v.toLocaleString("it-IT")}
                  </dt>
                  <dd className="font-mono text-[9px] uppercase tracking-widest text-bone/50 mt-2">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* HOLO ARTIFACT */}
          <div className="lg:col-span-5 relative fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative mx-auto w-full max-w-lg scan-sweep">
              {/* glow halo behind artifact */}
              <div className="absolute inset-16 rounded-full bg-cyan/30 blur-3xl pointer-events-none" />
              <div className="absolute inset-20 rounded-full bg-magenta/15 blur-2xl pointer-events-none" />

              {/* rotating rings — sopra all'immagine, decorativi */}
              <div className="absolute inset-0 border border-cyan/25 rotate-45 pointer-events-none" />
              <div className="absolute inset-4 border border-cyan/15 animate-[spin_80s_linear_infinite] pointer-events-none" />
              <div className="absolute inset-10 border border-magenta/20 animate-[spin_50s_linear_infinite_reverse] pointer-events-none" />

              {/* artifact image — proporzioni naturali, nessun ritaglio */}
              <div className="relative hud-frame m-6">
                <img
                  src={logo}
                  alt="Liberiamo la mente — libro di vetro olografico"
                  className="w-full h-auto block drop-shadow-[0_0_40px_oklch(0.82_0.16_200/0.6)]"
                />
              </div>

              {/* coordinates HUD */}
              <div className="font-mono text-[9px] tracking-widest text-cyan/80 pl-2 mt-1">
                ▸ ARTIFACT_001 / EST.2076
              </div>
            </div>

            {/* tagline — sogni nel cassetto */}
            <div className="mt-6 px-2 text-center">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-cyan/40 to-transparent mx-auto mb-4" />
              <p className="font-serif italic text-bone/75 text-lg md:text-xl leading-snug">
                {t("home.taglineCassetto")}
              </p>
              <p className="font-serif italic text-bone/45 text-base md:text-lg leading-snug mt-0.5">
                {t("home.taglineCassettoSub")}
              </p>
            </div>

            <div className="absolute -top-2 right-0 font-mono text-[9px] tracking-widest text-magenta/80">
              STATUS: ALIVE
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="border-y border-cyan/15 bg-deep/60 backdrop-blur overflow-hidden">
          <div className="marquee flex gap-12 py-4 whitespace-nowrap font-mono tracking-[0.3em] text-xs text-bone/60 uppercase">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-12 shrink-0">
                <span>▸ leggi online</span>
                <span className="text-magenta">▸ read or perish</span>
                <span>▸ scarica in pdf / e-book</span>
                <span className="text-cyan">▸ commenta l'autore</span>
                <span>▸ sostieni con donazione</span>
                <span className="text-amber">▸ liberiamo la mente</span>
                <span>▸ libri · racconti · saggi · articoli</span>
                <span className="text-magenta">▸ holo interface v7</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IN EVIDENZA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// in_evidenza</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone tracking-tight">{t("home.evidenzaTitolo")}</h2>
            <p className="mt-3 font-serif italic text-lg text-bone/65 max-w-xl">
              {t("home.evidenzaDesc")}
            </p>
          </div>
          <Link
            to="/catalogo"
            className="font-mono tracking-[0.22em] text-[10px] uppercase text-cyan border-b border-cyan/60 pb-1 hover:text-magenta hover:border-magenta transition-colors self-start md:self-auto"
          >
            ▸ {t("home.vediCatalogo")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featured.map((b) => <BookCard key={b.slug} book={b} />)}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="relative py-24 overflow-hidden scanlines">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[16rem] md:text-[22rem] tracking-tighter text-cyan/[0.04] select-none">
            MANIFESTO
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 relative">
          <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// manifesto.txt</div>
          <h2 className="mt-3 font-display text-5xl md:text-7xl leading-none text-bone tracking-tight">
            {t("home.manifestoTitolo")}<br /><span className="text-magenta text-glow-magenta">{t("home.manifestoSub")}</span>
          </h2>
          <ol className="mt-12 space-y-6">
            {[
              { n: "01", titolo: t("home.r01t"), desc: t("home.r01d") },
              { n: "02", titolo: t("home.r02t"), desc: t("home.r02d") },
              { n: "03", titolo: t("home.r03t"), desc: t("home.r03d") },
            ].map((r) => (
              <li key={r.n} className="glass p-6 md:p-8 grid grid-cols-[auto_1fr] gap-6 md:gap-10 items-baseline">
                <div className="font-display text-5xl md:text-6xl text-cyan text-glow-cyan">{r.n}</div>
                <div>
                  <h3 className="font-display text-2xl md:text-3xl text-bone tracking-tight">{r.titolo}</h3>
                  <p className="mt-3 font-serif italic text-bone/70 text-base md:text-lg max-w-2xl leading-relaxed">{r.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ULTIME USCITE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// ultime_pubblicazioni</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone tracking-tight">{t("home.ultimeTitle")}</h2>
          </div>
          <div className="flex items-center gap-4">
            {freshTotalPages > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFreshPage(p => Math.max(0, p - 1))}
                  disabled={freshPage === 0}
                  className="font-mono text-[11px] border border-cyan/30 px-3 py-1.5 text-cyan/70 hover:border-cyan hover:text-cyan transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">
                  {String(freshPage + 1).padStart(2, "0")} / {String(freshTotalPages).padStart(2, "0")}
                </span>
                <button
                  onClick={() => setFreshPage(p => Math.min(freshTotalPages - 1, p + 1))}
                  disabled={freshPage === freshTotalPages - 1}
                  className="font-mono text-[11px] border border-cyan/30 px-3 py-1.5 text-cyan/70 hover:border-cyan hover:text-cyan transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            )}
            <div className="font-mono text-[10px] tracking-widest text-cyan/60 uppercase blink">
              {t("home.uplink")}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {freshVisible.map((b) => <BookCard key={b.slug} book={b} compact />)}
        </div>
      </section>

      {/* CESTINO DEGLI SCRITTI PERDUTI */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-magenta/8 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 relative">
          <div className="glass hud-frame border-magenta/20 p-10 md:p-14 grid lg:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// archivio/perduti</div>
              <div className="group relative inline-block">
                <h2 className="mt-3 font-display text-4xl md:text-6xl text-bone leading-[0.95] tracking-tight">
                  Cestino degli<br /><span className="text-magenta text-glow-magenta">Scritti Perduti.</span>
                </h2>
                {cestinoTooltip && (
                  <p className="pointer-events-none mt-3 font-display text-3xl md:text-5xl text-cyan text-glow-cyan tracking-tight leading-tight opacity-0 scale-0 origin-top group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                    {cestinoTooltip}
                  </p>
                )}
              </div>
              <p className="mt-6 font-serif italic text-lg text-bone/70 max-w-2xl leading-relaxed">
                {t("home.cestinoDesc")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link
                  to="/cestino"
                  className="inline-flex items-center gap-3 border border-magenta bg-magenta/10 text-magenta px-7 py-4 font-mono tracking-[0.22em] text-[11px] uppercase hover:bg-magenta hover:text-void hover:glow-magenta transition-all"
                >
                  ⊗ {t("home.cestinoBtn")}
                </Link>
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className="w-2.5 h-2.5 rounded-full border border-magenta/40" />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">{t("home.cestinoVoti")}</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-center justify-center opacity-20 select-none">
              <div className="font-display text-[9rem] leading-none text-magenta">⊗</div>
              <div className="font-mono text-[10px] tracking-[0.5em] text-magenta uppercase mt-2">perduti</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA AUTORI / LETTORI */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pb-24">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass p-10 md:p-14 hud-frame">
            <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// per_gli_autori</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone leading-none tracking-tight">
              <Trans i18nKey="home.autoreTitolo" components={{ br: <br /> }} />
            </h2>
            <p className="mt-6 font-serif italic text-lg text-bone/70 max-w-md">
              {t("home.autoreDesc")}
            </p>
            {isAuthor ? (
              <span className="mt-8 inline-flex items-center gap-3 border border-cyan bg-cyan/10 text-cyan px-7 py-4 font-mono tracking-[0.22em] text-[11px] uppercase cursor-default select-none">
                ◆ {t("home.autoreBtnGiaAutore", "Sei un autore")}
              </span>
            ) : (
              <Link to={isLoggedIn ? "/auth/profilo-autore" : "/auth/registrazione"} search={isLoggedIn ? undefined : { autore: true }} className="mt-8 inline-flex items-center gap-3 border border-cyan bg-cyan/10 text-cyan px-7 py-4 font-mono tracking-[0.22em] text-[11px] uppercase hover:bg-cyan hover:text-void hover:glow-cyan transition-all">
                ▸ {t("home.autoreBtn")}
              </Link>
            )}
          </div>
          <div className="glass p-10 md:p-14 hud-frame-x relative">
            <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// per_i_lettori</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone leading-none tracking-tight">
              {t("home.lettoreTitoloA")}<br /><span className="text-magenta text-glow-magenta">{t("home.lettoreTitoloB")}</span>
            </h2>
            <p className="mt-6 font-serif italic text-lg text-bone/70 max-w-md">
              {t("home.lettoreDesc")}
            </p>
            <Link to="/catalogo" className="mt-8 inline-flex items-center gap-3 border border-magenta bg-magenta/10 text-magenta px-7 py-4 font-mono tracking-[0.22em] text-[11px] uppercase hover:bg-magenta hover:text-void hover:glow-magenta transition-all">
              ◆ {t("home.lettoreBtn")}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
