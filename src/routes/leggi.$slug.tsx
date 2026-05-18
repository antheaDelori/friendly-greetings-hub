import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getBookBySlug, type Book, type Genre } from "@/data/books";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";

export const Route = createFileRoute("/leggi/$slug")({
  loader: async ({ params }) => {
    // Prima cerca nei libri statici
    const staticBook = getBookBySlug(params.slug);
    if (staticBook) {
      const { data: { session } } = await supabase.auth.getSession();
      return { book: staticBook, fileUrl: null as string | null, donationUrl: null as string | null, isLoggedIn: !!session, isAnonymous: session?.user?.is_anonymous ?? false, userId: session?.user?.id ?? null, allegati: [] as { id: string; titolo: string; descrizione: string | null; file_url: string; tipo: string; ordine: number }[], isCestinato: false, votiCestino: 0, recuperato: false, bookId: "", authorId: null as string | null };
    }

    // Poi cerca su Supabase
    const { data } = await supabase
      .from("books")
      .select("id, slug, titolo, descrizione, estratto, genere, anno, letture, copertina_url, file_url, author_name, author_id, cestinato, voti_cestino, recuperato")
      .eq("slug", params.slug)
      .or("disponibile.eq.true,cestinato.eq.true")
      .maybeSingle();

    if (!data) throw notFound();

    // Carica i capitoli dalla tabella capitoli
    const { data: capData } = await supabase
      .from("capitoli")
      .select("id, ordine, titolo, testo")
      .eq("book_id", data.id)
      .order("ordine");

    const chapters: import("@/data/books").Chapter[] =
      capData && capData.length > 0
        ? capData.map((c: { id: string; titolo: string; testo: string }) => ({
            id: c.id,
            title: c.titolo,
            content: [c.testo],
            isHtml: true,
          }))
        : data.estratto
          ? [{ id: "estratto", title: "Estratto", content: data.estratto.split(/\n\n+/).filter((p: string) => p.trim()) }]
          : [];

    const author = data.author_name || "Autore";
    const book: Book = {
      slug: data.slug,
      title: data.titolo,
      author,
      authorSlug: author.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"),
      genre: (["libro", "racconto", "saggio", "articolo"].includes(data.genere)
        ? data.genere
        : "libro") as Genre,
      year: data.anno ?? new Date().getFullYear(),
      reads: data.letture,
      rating: 0,
      cover: data.copertina_url ?? logo,
      tagline: data.descrizione?.slice(0, 140) ?? "",
      description: data.descrizione ?? "",
      chapters,
    };

    const { data: allegatiData } = await supabase
      .from("allegati")
      .select("id, titolo, descrizione, file_url, tipo, ordine")
      .eq("book_id", data.id)
      .order("ordine");

    let donationUrl: string | null = null;
    if (data.author_id) {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("donation_url")
        .eq("id", data.author_id)
        .maybeSingle();
      donationUrl = profile?.donation_url ?? null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return {
      book,
      fileUrl: data.file_url as string | null,
      donationUrl,
      isLoggedIn: !!session,
      isAnonymous: session?.user?.is_anonymous ?? false,
      userId: session?.user?.id ?? null,
      allegati: (allegatiData ?? []) as { id: string; titolo: string; descrizione: string | null; file_url: string; tipo: string; ordine: number }[],
      isCestinato: (data.cestinato ?? false) as boolean,
      votiCestino: (data.voti_cestino ?? 0) as number,
      recuperato: (data.recuperato ?? false) as boolean,
      bookId: data.id as string,
      authorId: (data.author_id ?? null) as string | null,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.book.title} — ${loaderData.book.author} | Liberiamo la mente` },
          { name: "description", content: loaderData.book.description },
          { property: "og:title", content: `${loaderData.book.title} — ${loaderData.book.author}` },
          { property: "og:description", content: loaderData.book.description },
          { property: "og:image", content: loaderData.book.cover },
          { property: "og:type", content: "book" },
        ]
      : [],
  }),
  errorComponent: ReadError,
  notFoundComponent: ReadNotFound,
  component: ReadPage,
});

function ReadError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <div>
          <div className="font-display text-7xl text-blood">!</div>
          <h1 className="mt-4 font-display text-3xl text-ink">Errore di lettura</h1>
          <p className="mt-2 font-serif text-ink/70 max-w-md">{error.message}</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mt-6 bg-ink text-paper px-6 py-3 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors"
          >Riprova</button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function ReadNotFound() {
  const { slug } = Route.useParams();
  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <div>
          <div className="font-display text-8xl text-blood">404</div>
          <h1 className="mt-2 font-display text-3xl text-ink">Opera non trovata</h1>
          <p className="mt-2 font-serif text-ink/70">Lo slug "{slug}" non corrisponde ad alcuna opera.</p>
          <Link to="/catalogo" className="mt-6 inline-block bg-ink text-paper px-6 py-3 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors">
            Torna al catalogo
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function chapterReadingTime(chapter: import("@/data/books").Chapter): string {
  const raw = chapter.isHtml
    ? chapter.content[0].replace(/<[^>]+>/g, " ")
    : chapter.content.join(" ");
  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `~ ${minutes} min`;
}

function getOrCreateVisitorId(): string {
  const key = "visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function ReadPage() {
  const { book, fileUrl, donationUrl, isLoggedIn, isAnonymous, userId, allegati, isCestinato, votiCestino: initialVoti, recuperato, bookId, authorId } = Route.useLoaderData();
  const isAuthor = !!userId && !!authorId && userId === authorId;
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [resumeBanner, setResumeBanner] = useState(false);
  const savedIdxRef = useRef<number>(0);

  const [voti, setVoti] = useState(initialVoti ?? 0);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCestinato || !bookId) return;
    const visitorId = getOrCreateVisitorId();
    supabase.from("voti_cestino")
      .select("id")
      .eq("book_id", bookId)
      .eq("visitor_id", visitorId)
      .maybeSingle()
      .then(({ data }) => { if (data) setHasVoted(true); });
  }, []);

  const handleVota = async () => {
    if (hasVoted || voteLoading || !bookId) return;
    setVoteLoading(true);
    setVoteError(null);
    const visitorId = getOrCreateVisitorId();
    const { error } = await supabase.from("voti_cestino").insert({ book_id: bookId, visitor_id: visitorId });
    if (error) {
      if (error.code === "23505") {
        setHasVoted(true);
      } else {
        setVoteError("Errore nel voto. Riprova.");
      }
    } else {
      setHasVoted(true);
      const { data: updated } = await supabase.from("books").select("voti_cestino").eq("id", bookId).single();
      if (updated) setVoti(updated.voti_cestino ?? 0);
    }
    setVoteLoading(false);
  };

  // Torna sempre in cima quando si apre il libro
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  const bookmarkKey = `reading_pos_${book.slug}`;
  const bookmarkParaKey = `bookmark_para_${book.slug}`;
  const proseRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [paraBookmark, setParaBookmark] = useState<{ chapterIdx: number; paragraphIdx: number } | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false);

  const handleDownload = async () => {
    if (!fileUrl || downloading) return;
    setDownloading(true);
    try {
      // Estrae il path dal file_url (full URL Supabase) o lo usa direttamente se è già un path
      const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|authenticated)\/libri\/(.+?)(?:\?.*)?$/);
      const path = match ? decodeURIComponent(match[1]) : fileUrl.startsWith("http") ? null : fileUrl;
      if (!path) { window.open(fileUrl, "_blank"); return; }

      const { data: blob, error } = await supabase.storage.from("libri").download(path);
      if (error || !blob) {
        alert(`Errore nel download: ${error?.message ?? "file non trovato"}`);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop() ?? "libro";
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Download error:", e);
      alert("Errore nel download. Riprova.");
    } finally {
      setDownloading(false);
    }
  };

  // Carica il progresso dal database al mount
  useEffect(() => {
    if (!isLoggedIn || isAnonymous || !userId) return;
    supabase
      .from("reading_progress")
      .select("chapter_idx")
      .eq("user_id", userId)
      .eq("book_slug", book.slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.chapter_idx > 0 && data.chapter_idx < book.chapters.length) {
          savedIdxRef.current = data.chapter_idx;
          setResumeBanner(true);
        }
      });
  }, []);

  // Salva il progresso quando cambia capitolo
  useEffect(() => {
    if (book.chapters.length === 0 || isAnonymous) return;
    if (isLoggedIn && userId) {
      supabase.from("reading_progress").upsert({
        user_id: userId,
        book_slug: book.slug,
        chapter_idx: currentIdx,
        book_title: book.title,
        book_author: book.author,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_slug" });
    } else if (!isLoggedIn) {
      // Non loggato: salva in localStorage, verrà migrato su Supabase al login
      localStorage.setItem(bookmarkKey, JSON.stringify({ chapterIdx: currentIdx, title: book.title, author: book.author, ts: Date.now() }));
    }
  }, [currentIdx]);

  // Carica il segnalibro di paragrafo salvato (non per ospiti anonimi)
  useEffect(() => {
    if (isAnonymous) return;
    const saved = localStorage.getItem(bookmarkParaKey);
    if (!saved) return;
    try { setParaBookmark(JSON.parse(saved)); } catch { /* noop */ }
  }, []);

  // Marca visivamente il paragrafo e scrolla ad esso quando si cambia capitolo
  useEffect(() => {
    if (!proseRef.current) return;
    const paras = Array.from(proseRef.current.querySelectorAll('p'));
    paras.forEach(p => p.classList.remove('bookmarked-para'));
    if (!paraBookmark || paraBookmark.chapterIdx !== currentIdx) return;
    const target = paras[paraBookmark.paragraphIdx];
    if (!target) return;
    target.classList.add('bookmarked-para');
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }, [paraBookmark, currentIdx]);

  const handleProseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    const para = (e.target as HTMLElement).closest('p');
    if (!para || !proseRef.current) return;
    const paras = Array.from(proseRef.current.querySelectorAll('p'));
    const paragraphIdx = paras.indexOf(para as HTMLParagraphElement);
    if (paragraphIdx === -1) return;
    if (paraBookmark?.chapterIdx === currentIdx && paraBookmark?.paragraphIdx === paragraphIdx) {
      setParaBookmark(null);
      localStorage.removeItem(bookmarkParaKey);
    } else {
      const data = { chapterIdx: currentIdx, paragraphIdx };
      setParaBookmark(data);
      localStorage.setItem(bookmarkParaKey, JSON.stringify(data));
    }
  };

  const hasChapters = book.chapters.length > 0;
  const chapter = hasChapters ? book.chapters[currentIdx] : null;

  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <SiteHeader />

      {/* Lettore: 3 colonne su desktop */}
      <section className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-[210px_1fr_130px] gap-6 lg:gap-8 flex-1 items-start">

        {/* Sidebar sinistra: info libro + capitoli */}
        <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:col-start-1 flex flex-col">
          {/* Pulsante fisso — sempre visibile anche quando il contenuto scrolla */}
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-1.5 font-display tracking-widest text-[10px] uppercase text-blood/70 hover:text-blood border border-blood/25 hover:border-blood/60 px-3 py-2 transition-colors mb-3 shrink-0"
          >
            ← Torna al catalogo
          </Link>

          {/* Contenuto scrollabile: copertina, meta, capitoli */}
          <div className="lg:overflow-y-auto lg:min-h-0 flex-1">
          <img src={book.cover} alt="" className="w-full h-auto block ring-1 ring-ink/15 bg-ink/5" />

          <div className="mt-4">
            <div className="font-display tracking-[0.25em] text-[10px] text-blood uppercase">{book.genre} · {book.year}</div>
            <h1 className="mt-1 font-serif text-xl leading-tight text-ink">{book.title}</h1>
            <p className="font-serif italic text-sm text-ink/70 mt-0.5">di {book.author}</p>
            <p className="mt-3 font-serif text-sm text-ink/70 leading-relaxed line-clamp-4">{book.description}</p>
          </div>

{hasChapters && (
            <div className="mt-6 border-t border-ink/10 pt-5">
              <div className="font-display tracking-[0.2em] text-xs text-ink/50 mb-3">— capitoli</div>
              <ol className="space-y-1">
                {book.chapters.map((c: { id: string; title: string; content: string[] }, i: number) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setCurrentIdx(i)}
                      className={`w-full text-left px-3 py-2 font-serif text-sm transition-colors border-l-2 ${
                        i === currentIdx
                          ? "border-blood bg-card text-ink"
                          : "border-transparent text-ink/60 hover:text-ink hover:border-ink/30"
                      }`}
                    >
                      <span className="font-display text-xs tracking-widest text-ink/40 mr-2">{String(i + 1).padStart(2, "0")}</span>
                      {c.title}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          </div>
        </aside>

        {/* Sidebar destra sticky: azioni + font — prima dell'article nel DOM così su mobile appare tra info e testo */}
        <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:col-start-3 lg:row-start-1 flex flex-row flex-wrap lg:flex-col gap-2">
          {fileUrl && isLoggedIn && !isAnonymous ? (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="text-sm leading-none">↓</span>
              <span>{downloading ? "Apertura…" : "Scarica"}</span>
            </button>
          ) : fileUrl && isLoggedIn && isAnonymous ? (
            <Link
              to="/auth/"
              search={{ returnTo: `/leggi/${book.slug}` }}
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors"
              title="Registrati per scaricare il file"
            >
              <span className="text-sm leading-none">↓</span>
              <span>Registrati</span>
            </Link>
          ) : fileUrl && !isLoggedIn ? (
            <Link
              to="/auth/"
              search={{ returnTo: `/leggi/${book.slug}` }}
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors"
            >
              <span className="text-sm leading-none">↓</span>
              <span>Scarica</span>
            </Link>
          ) : (
            <span className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink/20 text-ink/30 px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase cursor-not-allowed">
              <span className="text-sm leading-none">↓</span>
              <span>N/D</span>
            </span>
          )}
          <button className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors">
            <span className="text-sm leading-none">★</span>
            <span>Recensisci</span>
          </button>
          {donationUrl && (
            <a
              href={donationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-blood text-blood px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-blood hover:text-paper transition-colors"
            >
              <span className="text-sm leading-none">♥</span>
              <span>Sostieni</span>
            </a>
          )}

          <div className="w-full lg:mt-4 lg:border-t lg:border-ink/10 lg:pt-4">
            <div className="hidden lg:block font-display tracking-[0.15em] text-[9px] text-ink/50 mb-2 uppercase">— testo</div>
            <div className="flex w-full">
              <button onClick={() => setFontScale((s) => Math.max(0.85, s - 0.1))} className="flex-1 font-serif text-sm border border-ink/20 py-2 hover:border-ink text-center">A−</button>
              <button onClick={() => setFontScale(1)} className="flex-1 font-serif text-sm border-t border-b border-ink/20 py-2 hover:border-ink text-center">A</button>
              <button onClick={() => setFontScale((s) => Math.min(1.4, s + 0.1))} className="flex-1 font-serif text-lg border border-ink/20 py-2 hover:border-ink text-center">A+</button>
            </div>
          </div>

          {/* Legenda segnalibro — solo desktop */}
          <div className="w-full hidden lg:flex lg:flex-col mt-2 border-t border-ink/10 pt-4">
            <div className="font-display tracking-[0.15em] text-[9px] text-ink/50 mb-2 uppercase">— segnalibro</div>
            <p className="font-serif text-[11px] text-ink/50 leading-relaxed italic">
              Clicca su un paragrafo del testo per salvare il punto di lettura.
              Al prossimo accesso tornerai esattamente lì.
            </p>
            <p className="mt-2 font-serif text-[11px] text-ink/35 italic">
              Clicca di nuovo per rimuoverlo.
            </p>
          </div>
        </aside>

        {/* Testo capitolo */}
        <article ref={articleRef} id="lettura" style={{ scrollMarginTop: "7rem" }} className="lg:col-start-2 lg:row-start-1">
          {resumeBanner && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-blood/30 bg-blood/5 px-4 py-3">
              <p className="font-serif italic text-sm text-ink/70">
                ◈ Segnalibro al capitolo {savedIdxRef.current + 1}
                {book.chapters[savedIdxRef.current] && (
                  <span className="text-blood"> — {book.chapters[savedIdxRef.current].title}</span>
                )}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => { setCurrentIdx(savedIdxRef.current); setResumeBanner(false); }}
                  className="font-display tracking-widest text-[10px] uppercase text-blood hover:underline"
                >
                  Riprendi
                </button>
                <button
                  onClick={() => { localStorage.removeItem(bookmarkKey); setResumeBanner(false); }}
                  className="font-display tracking-widest text-[10px] uppercase text-ink/30 hover:text-ink"
                >
                  Ignora
                </button>
              </div>
            </div>
          )}

          {isCestinato && (
            <div className="mb-8 border border-magenta/50 bg-magenta/5 p-5 space-y-4">
              <div>
                <div className="font-mono text-[9px] tracking-widest text-magenta uppercase mb-1">
                  ⊗ Cestino degli Scritti Perduti
                </div>
                <p className="font-serif italic text-ink/70 text-sm">
                  Questo testo è nel cestino. Leggilo, e se ti piace vota per recuperarlo.
                  Al quinto voto tornerà disponibile in catalogo con il badge "Recuperato dai lettori".
                </p>
              </div>
              <div className="flex items-center gap-5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }, (_, idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-3 rounded-full border transition-colors ${
                        idx < voti ? "bg-magenta border-magenta" : "border-magenta/30"
                      }`}
                    />
                  ))}
                  <span className="font-display text-sm text-ink/50 ml-1">{voti}/5</span>
                </div>
                {voti >= 5 ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-blood border border-blood/30 px-3 py-1.5">
                    ✓ Recuperato!
                  </span>
                ) : hasVoted ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest border border-magenta/40 text-magenta/70 px-3 py-1.5">
                    ✓ Voto registrato
                  </span>
                ) : (
                  <button
                    onClick={handleVota}
                    disabled={voteLoading}
                    className="font-mono text-[10px] uppercase tracking-widest border border-magenta bg-magenta/10 text-magenta hover:bg-magenta hover:text-void px-4 py-2 transition-all disabled:opacity-50"
                  >
                    {voteLoading ? "..." : "♥ Vota per il recupero"}
                  </button>
                )}
                {voteError && <span className="font-mono text-[10px] text-magenta">{voteError}</span>}
              </div>
              {isAuthor && (
                <div className="border-t border-magenta/20 pt-4 space-y-3">
                  <span className="font-mono text-[9px] tracking-widest text-magenta/60 uppercase">// area autore</span>
                  {!confirmDeleteBook ? (
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="/gestione"
                        className="font-mono text-[10px] uppercase tracking-widest border border-cyan/50 bg-cyan/5 text-cyan hover:bg-cyan hover:text-void px-4 py-2 transition-all"
                      >
                        ◆ Modifica
                      </a>
                      <button
                        onClick={() => setConfirmDeleteBook(true)}
                        className="font-mono text-[10px] uppercase tracking-widest border border-magenta/50 text-magenta/70 hover:bg-magenta hover:text-void px-4 py-2 transition-all"
                      >
                        ✕ Cancella
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="font-mono text-[10px] text-magenta">Eliminare definitivamente?</span>
                      <button
                        onClick={async () => {
                          await supabase.from("books").delete().eq("id", bookId);
                          window.location.replace("/gestione");
                        }}
                        className="font-mono text-[10px] uppercase tracking-widest border border-magenta bg-magenta/10 text-magenta hover:bg-magenta hover:text-void px-4 py-2 transition-all"
                      >
                        ✕ Sì, elimina
                      </button>
                      <button
                        onClick={() => setConfirmDeleteBook(false)}
                        className="font-mono text-[10px] uppercase tracking-widest border border-bone/20 text-bone/40 hover:text-bone px-4 py-2 transition-all"
                      >
                        Annulla
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isCestinato && book.description && (
            <div className="mb-8 border-l-2 border-magenta pl-6 py-2">
              <div className="font-mono text-sm tracking-widest text-magenta uppercase mb-3">— estratto</div>
              <p className="font-serif italic text-lg text-ink leading-relaxed">{book.description}</p>
            </div>
          )}

          {recuperato && !isCestinato && (
            <div className="mb-6 flex items-center gap-3 border border-blood/30 bg-blood/5 px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-blood">★ Recuperato dai lettori</span>
              <span className="font-serif italic text-sm text-ink/60">Quest'opera è stata salvata dal cestino grazie ai voti della community.</span>
            </div>
          )}

          {!isLoggedIn && !isCestinato ? (
            <div className="py-20 text-center border-2 border-ink/10 flex flex-col items-center">
              <div className="font-display text-6xl text-ink/15">◈</div>
              <h2 className="mt-4 font-serif text-2xl text-ink">Contenuto riservato</h2>
              <p className="mt-3 font-serif italic text-ink/60 max-w-sm">
                L'estratto e i capitoli sono disponibili per i lettori registrati. L'accesso è gratuito.
              </p>
              <Link
                to="/auth/"
                search={{ returnTo: `/leggi/${book.slug}` }}
                className="mt-7 inline-block bg-ink text-paper px-7 py-3 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors"
              >
                Accedi o registrati
              </Link>
              <button
                onClick={() => router.history.back()}
                className="mt-3 font-display tracking-widest text-[10px] uppercase text-ink/40 hover:text-ink transition-colors"
              >
                ← Torna al catalogo
              </button>
            </div>
          ) : chapter ? (
            <>
              <div className="flex items-center justify-between">
                <div className="font-display tracking-[0.25em] text-xs text-magenta">capitolo {currentIdx + 1} di {book.chapters.length}</div>
                <div className="font-display tracking-[0.2em] text-xs text-magenta/60">{chapterReadingTime(chapter)}</div>
              </div>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl text-ink">{chapter.title}</h2>

              <div className="mt-6 h-[2px] bg-ink/10 relative">
                <div className="absolute inset-y-0 left-0 bg-blood" style={{ width: `${((currentIdx + 1) / book.chapters.length) * 100}%` }} />
              </div>

              {chapter.isHtml ? (
                <div
                  ref={proseRef}
                  className="mt-10 font-serif text-ink/90 leading-[1.65] max-w-prose chapter-prose chapter-bookmark-area"
                  style={{ fontSize: `${1.0 * fontScale}rem` }}
                  onClick={handleProseClick}
                  dangerouslySetInnerHTML={{ __html: chapter.content[0] }}
                />
              ) : (
                <div
                  ref={proseRef}
                  className="mt-10 font-serif text-ink/90 leading-[1.8] space-y-6 max-w-prose chapter-bookmark-area"
                  style={{ fontSize: `${1.0 * fontScale}rem` }}
                  onClick={handleProseClick}
                >
                  {chapter.content.map((p: string, i: number) => (
                    <p key={i} className={i === 0 ? "first-letter:font-display first-letter:text-7xl first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-blood" : ""}>
                      {p}
                    </p>
                  ))}
                </div>
              )}

              {book.chapters.length > 1 && (
                <div className="mt-16 flex items-center justify-between border-t border-ink/10 pt-6">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    className="font-display tracking-widest text-xs uppercase text-ink hover:text-blood disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Capitolo precedente
                  </button>
                  <span className="font-display text-xs tracking-widest text-ink/40">
                    {String(currentIdx + 1).padStart(2, "0")} / {String(book.chapters.length).padStart(2, "0")}
                  </span>
                  <button
                    disabled={currentIdx === book.chapters.length - 1}
                    onClick={() => setCurrentIdx((i) => Math.min(book.chapters.length - 1, i + 1))}
                    className="font-display tracking-widest text-xs uppercase text-ink hover:text-blood disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Capitolo successivo →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center border-2 border-ink/10">
              <div className="font-display text-5xl text-ink/20">◊</div>
              <p className="mt-4 font-serif italic text-xl text-ink/50">Nessun estratto disponibile per questa opera.</p>
              {fileUrl && (
                <p className="mt-2 font-serif text-sm text-ink/40">Scarica il file per leggere il contenuto completo.</p>
              )}
            </div>
          )}

          {/* Materiali extra */}
          {allegati.length > 0 && (
            <div className="mt-16">
              <div className="font-display tracking-[0.25em] text-xs text-blood mb-4">— materiali extra</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allegati.map(a => (
                  <div key={a.id} className="border border-ink/20 bg-card p-4 flex gap-4 items-start">
                    {a.tipo === "immagine" ? (
                      <>
                        <button onClick={() => setLightboxUrl(a.file_url)} className="flex-shrink-0 w-20 h-20 overflow-hidden border border-ink/10 hover:border-blood transition-colors">
                          <img src={a.file_url} alt={a.titolo} className="w-full h-full object-cover" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="font-display tracking-widest text-xs uppercase text-ink">{a.titolo}</div>
                          {a.descrizione && (
                            <p className="mt-1 font-serif text-sm text-ink/60 leading-snug">{a.descrizione}</p>
                          )}
                          <button onClick={() => setLightboxUrl(a.file_url)}
                            className="mt-2 font-mono text-[10px] tracking-widest text-blood uppercase hover:underline">
                            ◈ Visualizza
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center border border-ink/10 text-3xl text-ink/30">↓</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display tracking-widest text-xs uppercase text-ink">{a.titolo}</div>
                          {a.descrizione && (
                            <p className="mt-1 font-serif text-sm text-ink/60 leading-snug">{a.descrizione}</p>
                          )}
                          <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                            className="mt-2 inline-block font-mono text-[10px] tracking-widest text-blood uppercase hover:underline">
                            ↓ Scarica
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community placeholder */}
          <div className="mt-16 border-2 border-ink p-6 md:p-8 bg-card">
            <div className="font-display tracking-[0.25em] text-xs text-blood">— community</div>
            <h3 className="mt-2 font-serif text-2xl text-ink">Cosa ne pensi?</h3>
            <p className="mt-2 font-serif text-ink/70">Lascia un commento, una recensione o segui l'autore. (Disponibile dopo il login.)</p>
            <textarea
              placeholder="Scrivi un commento..."
              className="mt-4 w-full min-h-24 bg-paper border border-ink/20 p-3 font-serif focus:outline-none focus:border-blood transition-colors"
              disabled
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button disabled className="bg-ink text-paper px-5 py-2 font-display tracking-widest text-xs uppercase opacity-50 cursor-not-allowed">Pubblica commento</button>
              <button disabled className="border border-ink text-ink px-5 py-2 font-display tracking-widest text-xs uppercase opacity-50 cursor-not-allowed">Segui {book.author}</button>
            </div>
          </div>
        </article>
      </section>

      <SiteFooter />

      {/* Lightbox immagine */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-void/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-5 font-mono text-ink/50 hover:text-ink text-2xl transition-colors"
          >✕</button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-[90vh] object-contain shadow-2xl cursor-default"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
