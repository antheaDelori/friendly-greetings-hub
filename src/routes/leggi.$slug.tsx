import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getBookBySlug, type Book, type Genre } from "@/data/books";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";
import { generateBookPdf } from "@/lib/generateBookPdf";

type RecensioneItem = {
  id: string;
  user_id: string;
  nome_display: string | null;
  stelle: number;
  testo: string | null;
  created_at: string;
};

export const Route = createFileRoute("/leggi/$slug")({
  loader: async ({ params }) => {
    // Prima cerca nei libri statici
    const staticBook = getBookBySlug(params.slug);
    if (staticBook) {
      const { data: { session } } = await supabase.auth.getSession();
      return { book: staticBook, fileUrl: null as string | null, epubUrl: null as string | null, donationUrl: null as string | null, isLoggedIn: !!session, isAnonymous: session?.user?.is_anonymous ?? false, userId: session?.user?.id ?? null, allegati: [] as { id: string; titolo: string; descrizione: string | null; file_url: string; tipo: string; ordine: number }[], isCestinato: false, votiCestino: 0, recuperato: false, bookId: "", authorId: null as string | null, recensioni: [] as RecensioneItem[] };
    }

    // Poi cerca su Supabase
    const { data } = await supabase
      .from("books")
      .select("id, slug, titolo, descrizione, estratto, genere, anno, letture, copertina_url, copertina_flat_url, file_url, epub_url, author_name, author_id, cestinato, voti_cestino, recuperato")
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
      cover: data.copertina_flat_url ?? data.copertina_url ?? logo,
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
    let authorBio: string | null = null;
    if (data.author_id) {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("donation_url, bio")
        .eq("id", data.author_id)
        .maybeSingle();
      donationUrl = profile?.donation_url ?? null;
      authorBio = profile?.bio ?? null;
    }

    const { data: recensioniData } = await supabase
      .from("recensioni")
      .select("id, user_id, nome_display, stelle, testo, created_at")
      .eq("book_id", data.id)
      .order("created_at", { ascending: false });

    const { count: likesCount } = await supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("book_id", data.id);

    const { data: { session } } = await supabase.auth.getSession();

    let userHasLiked = false;
    if (session?.user?.id && !session.user.is_anonymous) {
      const { data: userLike } = await supabase
        .from("likes")
        .select("id")
        .eq("book_id", data.id)
        .eq("user_id", session.user.id)
        .maybeSingle();
      userHasLiked = !!userLike;
    }

    return {
      book,
      fileUrl: data.file_url as string | null,
      epubUrl: data.epub_url as string | null,
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
      recensioni: (recensioniData ?? []) as RecensioneItem[],
      likesCount: (likesCount ?? 0) as number,
      userHasLiked,
      authorBio,
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

function getOrCreateVisitorId(userId?: string | null): string {
  if (userId) return userId;
  const key = "visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function ReadPage() {
  const { book, fileUrl, epubUrl, donationUrl, isLoggedIn, isAnonymous, userId, allegati, isCestinato, votiCestino: initialVoti, recuperato, bookId, authorId, recensioni: inizialiRecensioni, authorBio } = Route.useLoaderData();
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
    const visitorId = getOrCreateVisitorId(isAnonymous ? null : userId);
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
    const visitorId = getOrCreateVisitorId(isAnonymous ? null : userId);
    const { error } = await supabase.from("voti_cestino").insert({ book_id: bookId, visitor_id: visitorId });
    if (error) {
      if (error.code === "23505") {
        setHasVoted(true);
      } else {
        setVoteError("Errore nel voto. Riprova.");
      }
    } else {
      setHasVoted(true);
      setVoti(prev => prev + 1);
    }
    setVoteLoading(false);
  };

  // Torna sempre in cima quando si apre il libro
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  // Auto-aggiorna libreria: da_leggere → in_lettura all'apertura del libro
  useEffect(() => {
    if (!bookId) return;
    const checkAndUpdate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) return;
      const { data } = await supabase.from("libreria")
        .select("id, stato")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle();
      if (!data) return;
      setLibreriaEntryId(data.id);
      setLibreriaStato(data.stato);
      if (data.stato === "da_leggere") {
        await supabase.from("libreria").update({ stato: "in_lettura" }).eq("id", data.id);
        setLibreriaStato("in_lettura");
      }
    };
    checkAndUpdate();
  }, [bookId]);

  const [libreriaEntryId, setLibreriaEntryId] = useState<string | null>(null);
  const [libreriaStato, setLibreriaStato] = useState<string | null>(null);

  const handleSegnaLetto = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) return;
    if (libreriaEntryId) {
      // Il libro è già in libreria → aggiorna stato
      await supabase.from("libreria").update({ stato: "letto" }).eq("id", libreriaEntryId);
    } else {
      // Non è in libreria → inserisci direttamente come "letto"
      const { data } = await supabase.from("libreria")
        .insert({ user_id: user.id, book_id: bookId, stato: "letto" })
        .select("id")
        .single();
      if (data) setLibreriaEntryId(data.id);
    }
    setLibreriaStato("letto");
  };

  const bookmarkKey = `reading_pos_${book.slug}`;
  const bookmarkParaKey = `bookmark_para_${book.slug}`;
  const proseRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [paraBookmark, setParaBookmark] = useState<{ chapterIdx: number; paragraphIdx: number } | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadingEpub, setDownloadingEpub] = useState(false);

  const [recensioni, setRecensioni] = useState<RecensioneItem[]>(inizialiRecensioni);

  const [likesCount, setLikesCount] = useState<number>(Route.useLoaderData().likesCount ?? 0);
  const [userHasLiked, setUserHasLiked] = useState<boolean>(Route.useLoaderData().userHasLiked ?? false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleToggleLike = async () => {
    if (!isLoggedIn || isAnonymous || !bookId || !userId) return;
    if (userHasLiked) {
      // Aggiornamento ottimistico immediato
      setUserHasLiked(false);
      setLikesCount((c: number) => Math.max(0, c - 1));
      const { error } = await supabase.from("likes").delete().eq("book_id", bookId).eq("user_id", userId);
      if (error) { setUserHasLiked(true); setLikesCount((c: number) => c + 1); } // rollback
    } else {
      // Aggiornamento ottimistico immediato
      setUserHasLiked(true);
      setLikesCount((c: number) => c + 1);
      const { error } = await supabase.from("likes").insert({ book_id: bookId, user_id: userId });
      if (error) { setUserHasLiked(false); setLikesCount((c: number) => Math.max(0, c - 1)); } // rollback
    }
  };

  const [recStelle, setRecStelle] = useState(0);
  const [recHover, setRecHover] = useState(0);
  const [recTesto, setRecTesto] = useState("");
  const [recSaving, setRecSaving] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const recensioniRef = useRef<HTMLDivElement>(null);

  const miaRecensione = recensioni.find(r => r.user_id === userId) ?? null;
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false);

  const handleSalvaRecensione = async () => {
    if (!userId || recStelle === 0 || recSaving || !bookId) return;
    setRecSaving(true);
    setRecError(null);
    try {
      const { data: profile } = await supabase.from("profiles").select("nome, cognome, pseudonimo").eq("id", userId).maybeSingle();
      const nome_display = profile?.pseudonimo || [profile?.nome, profile?.cognome].filter(Boolean).join(" ") || "Lettore";
      const { data: inserted, error } = await supabase.from("recensioni")
        .insert({ book_id: bookId, user_id: userId, nome_display, stelle: recStelle, testo: recTesto.trim() || null })
        .select("id, user_id, nome_display, stelle, testo, created_at")
        .single();
      if (error) { setRecError(error.code === "23505" ? "Hai già recensito questa opera." : error.message); return; }
      setRecensioni((prev: RecensioneItem[]) => [inserted as RecensioneItem, ...prev]);
      setRecStelle(0);
      setRecTesto("");
    } finally {
      setRecSaving(false);
    }
  };

  const handleEliminaRecensione = async (id: string) => {
    await supabase.from("recensioni").delete().eq("id", id);
    setRecensioni(prev => prev.filter(r => r.id !== id));
  };

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
      a.download = book.title.replace(/[^a-z0-9àèéìòù ]/gi, "").trim().replace(/\s+/g, "-").toLowerCase() + ".pdf";
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

  const handleDownloadEpub = async () => {
    if (!epubUrl || downloadingEpub) return;
    setDownloadingEpub(true);
    try {
      const match = epubUrl.match(/\/storage\/v1\/object\/(?:public|authenticated)\/libri\/(.+?)(?:\?.*)?$/);
      const path = match ? decodeURIComponent(match[1]) : epubUrl.startsWith("http") ? null : epubUrl;
      if (!path) { window.open(epubUrl, "_blank"); return; }
      const { data: blob, error } = await supabase.storage.from("libri").download(path);
      if (error || !blob) { alert(`Errore nel download: ${error?.message ?? "file non trovato"}`); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = book.title.replace(/[^a-z0-9àèéìòù ]/gi, "").trim().replace(/\s+/g, "-").toLowerCase() + ".epub";
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Download epub error:", e);
      alert("Errore nel download. Riprova.");
    } finally {
      setDownloadingEpub(false);
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
            className="inline-flex items-center gap-1.5 font-display tracking-widest text-[10px] uppercase text-blood/70 hover:text-blood border border-blood/25 hover:border-blood/60 px-3 py-2 transition-colors mb-3 shrink-0 cursor-pointer"
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
                      className={`w-full text-left px-3 py-2 font-serif text-sm transition-colors border-l-2 cursor-pointer ${
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
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="text-sm leading-none">↓</span>
              <span>{downloading ? "Apertura…" : "PDF"}</span>
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
              <span>PDF</span>
            </Link>
          ) : (
            <span className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink/20 text-ink/30 px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase cursor-not-allowed">
              <span className="text-sm leading-none">↓</span>
              <span>N/D</span>
            </span>
          )}
          {epubUrl && isLoggedIn && !isAnonymous ? (
            <button
              onClick={handleDownloadEpub}
              disabled={downloadingEpub}
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="text-sm leading-none">↓</span>
              <span>{downloadingEpub ? "Apertura…" : "E-Book"}</span>
            </button>
          ) : epubUrl && (isAnonymous || !isLoggedIn) ? (
            <Link
              to="/auth/"
              search={{ returnTo: `/leggi/${book.slug}` }}
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors"
            >
              <span className="text-sm leading-none">↓</span>
              <span>E-Book</span>
            </Link>
          ) : null}
          {/* Like — solo per libri Supabase (bookId non vuoto) */}
          {bookId && (isLoggedIn && !isAnonymous ? (
            <button
              onClick={handleToggleLike}
              className={`flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase transition-colors cursor-pointer ${
                userHasLiked
                  ? "border-blood bg-blood/10 text-blood hover:bg-blood hover:text-paper"
                  : "border-ink text-ink hover:bg-ink hover:text-paper"
              }`}
            >
              <span className="text-sm leading-none">{userHasLiked ? "♥" : "♡"}</span>
              <span>Like</span>
            </button>
          ) : (
            <Link
              to="/auth/"
              search={{ returnTo: `/leggi/${book.slug}` }}
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors"
            >
              <span className="text-sm leading-none">♡</span>
              <span>Like</span>
            </Link>
          ))}

          <button
            onClick={() => recensioniRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors cursor-pointer"
          >
            <span className="text-sm leading-none">★</span>
            <span>Recensisci</span>
          </button>

          {/* Stampa PDF */}
          <button
            onClick={async () => {
              if (pdfLoading) return;
              setPdfLoading(true);
              try { await generateBookPdf(book, authorBio); }
              finally { setPdfLoading(false); }
            }}
            disabled={pdfLoading}
            className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors cursor-pointer disabled:opacity-40"
          >
            <span className="text-sm leading-none">{pdfLoading ? "…" : "⎙"}</span>
            <span>{pdfLoading ? "Genera" : "Stampa"}</span>
          </button>

          {donationUrl && (
            <a
              href={donationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-blood text-blood px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-blood hover:text-paper transition-colors cursor-pointer"
            >
              <span className="text-sm leading-none">♥</span>
              <span>Sostieni</span>
            </a>
          )}

          {/* Segna come letto — sempre visibile per utenti loggati */}
          {isLoggedIn && !isAnonymous && (
            libreriaStato === "letto" ? (
              <span className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink/30 text-ink/35 px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase cursor-default select-none">
                <span className="text-sm leading-none">✓</span>
                <span>Letto</span>
              </span>
            ) : (
              <button
                onClick={handleSegnaLetto}
                className="flex-1 lg:flex-none inline-flex flex-col items-center justify-center gap-1 border border-ink text-ink px-2 py-3 font-display tracking-[0.12em] text-[9px] uppercase hover:bg-ink hover:text-paper transition-colors cursor-pointer"
              >
                <span className="text-sm leading-none">◈</span>
                <span>Letto?</span>
              </button>
            )
          )}

          <div className="w-full lg:mt-4 lg:border-t lg:border-ink/10 lg:pt-4">
            <div className="hidden lg:block font-display tracking-[0.15em] text-[9px] text-ink/50 mb-2 uppercase">— testo</div>
            <div className="flex w-full">
              <button onClick={() => setFontScale((s) => Math.max(0.85, s - 0.1))} className="flex-1 font-serif text-sm border border-ink/20 py-2 hover:border-ink text-center cursor-pointer">A−</button>
              <button onClick={() => setFontScale(1)} className="flex-1 font-serif text-sm border-t border-b border-ink/20 py-2 hover:border-ink text-center cursor-pointer">A</button>
              <button onClick={() => setFontScale((s) => Math.min(1.4, s + 0.1))} className="flex-1 font-serif text-lg border border-ink/20 py-2 hover:border-ink text-center cursor-pointer">A+</button>
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

          {/* Legenda pulsante Letto — solo desktop */}
          <div className="w-full hidden lg:flex lg:flex-col mt-2 border-t border-ink/10 pt-4">
            <div className="font-display tracking-[0.15em] text-[9px] text-ink/50 mb-2 uppercase">— hai già letto?</div>
            <p className="font-serif text-[11px] text-ink/50 leading-relaxed italic">
              Puoi segnare un'opera come letta anche se non l'hai terminata qui.
              È un modo per tenere traccia di ciò che conosci già.
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
                <div className="font-mono text-[11px] font-semibold tracking-widest text-magenta uppercase mb-1">
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
                ) : !isLoggedIn || isAnonymous ? (
                  <Link
                    to="/auth/registrazione"
                    className="font-mono text-[10px] uppercase tracking-widest border border-magenta/40 text-magenta/60 hover:border-magenta hover:text-magenta px-4 py-2 transition-all"
                  >
                    ▸ Registrati per votare
                  </Link>
                ) : hasVoted ? (
                  <span className="relative group font-mono text-[10px] uppercase tracking-widest border border-magenta/40 text-magenta/70 px-3 py-1.5 cursor-default">
                    ✓ Voto registrato
                    <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap bg-void border border-magenta/40 text-magenta/80 font-mono text-[9px] tracking-widest px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      Hai già espresso il tuo voto
                    </span>
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

              {/* Banner fine libro — solo ultimo capitolo, solo utenti loggati */}
              {currentIdx === book.chapters.length - 1 && isLoggedIn && !isAnonymous && (
                <div className="mt-16 border-t border-ink/10 pt-8 text-center">
                  {libreriaStato === "letto" ? (
                    <span className="font-display tracking-widest text-sm uppercase text-ink/40">
                      ✓ Spostato nello scaffale dei libri letti
                    </span>
                  ) : (
                    <button
                      onClick={handleSegnaLetto}
                      className="font-display tracking-widest text-sm uppercase text-ink/50 hover:text-blood border border-ink/20 hover:border-blood/40 px-6 py-3 transition-all cursor-pointer"
                    >
                      ◈ Lo sposto nello scaffale dei libri letti?
                    </button>
                  )}
                </div>
              )}

              {book.chapters.length > 1 && (
                <div className="mt-10 flex items-center justify-between border-t border-ink/10 pt-6">
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

          {/* Recensioni */}
          <div ref={recensioniRef} className="mt-16 border-2 border-ink/10 p-6 md:p-8 bg-card" style={{ scrollMarginTop: "7rem" }}>
            <div className="font-display tracking-[0.25em] text-xs text-blood">— recensioni</div>
            <div className="flex items-baseline gap-3 mt-2">
              <h3 className="font-serif text-2xl text-ink">Cosa ne pensi?</h3>
              {recensioni.length > 0 && (
                <span className="font-mono text-[10px] tracking-widest text-ink/40 uppercase">{recensioni.length} {recensioni.length === 1 ? "recensione" : "recensioni"}</span>
              )}
            </div>

            {/* Like button nella sezione recensioni */}
            {bookId && (
              <div className="mt-5 flex items-center gap-3">
                {isLoggedIn && !isAnonymous ? (
                  <button
                    onClick={handleToggleLike}
                    className={`inline-flex items-center gap-2 border px-5 py-2.5 font-display tracking-widest text-xs uppercase transition-colors cursor-pointer ${
                      userHasLiked
                        ? "border-blood bg-blood/5 text-blood hover:bg-blood hover:text-paper"
                        : "border-ink/30 text-ink/60 hover:border-blood hover:text-blood"
                    }`}
                  >
                    <span className="text-base leading-none">{userHasLiked ? "♥" : "♡"}</span>
                    <span>{userHasLiked ? "Ti piace" : "Mi piace"}</span>
                  </button>
                ) : (
                  <Link
                    to="/auth/"
                    search={{ returnTo: `/leggi/${book.slug}` }}
                    className="inline-flex items-center gap-2 border border-ink/30 text-ink/50 px-5 py-2.5 font-display tracking-widest text-xs uppercase hover:border-blood hover:text-blood transition-colors"
                  >
                    <span className="text-base leading-none">♡</span>
                    <span>Mi piace</span>
                  </Link>
                )}
                {likesCount > 0 && (
                  <span className="font-mono text-[11px] tracking-widest text-ink/60">
                    ♥ {likesCount} {likesCount === 1 ? "persona ha apprezzato" : "persone hanno apprezzato"}
                  </span>
                )}
              </div>
            )}

            {/* Form recensione */}
            {isLoggedIn && !isAnonymous ? (
              miaRecensione ? (
                <div className="mt-6 border border-blood/30 bg-blood/5 p-4">
                  <div className="font-display tracking-widest text-[10px] uppercase text-blood mb-2">— la tua recensione</div>
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`text-lg ${i < miaRecensione.stelle ? "text-blood" : "text-ink/25"}`}>
                        {i < miaRecensione.stelle ? "★" : "☆"}
                      </span>
                    ))}
                  </div>
                  {miaRecensione.testo && <p className="font-serif italic text-ink/70 text-sm leading-relaxed">{miaRecensione.testo}</p>}
                  <button
                    onClick={() => handleEliminaRecensione(miaRecensione.id)}
                    className="mt-3 font-mono text-[10px] tracking-widest uppercase text-ink/40 hover:text-blood transition-colors cursor-pointer"
                  >
                    ✕ Elimina
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-widest text-ink/50 uppercase mb-2">Valutazione ★</div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRecStelle(s)}
                          onMouseEnter={() => setRecHover(s)}
                          onMouseLeave={() => setRecHover(0)}
                          className={`text-2xl transition-colors cursor-pointer ${s <= (recHover || recStelle) ? "text-blood" : "text-ink/30"}`}
                        >{s <= (recHover || recStelle) ? "★" : "☆"}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] tracking-widest text-ink/50 uppercase mb-2">Commento (opzionale)</div>
                    <textarea
                      value={recTesto}
                      onChange={e => setRecTesto(e.target.value)}
                      placeholder="Scrivi cosa ti ha colpito di questa opera..."
                      className="w-full min-h-24 bg-paper border border-ink/20 p-3 font-serif text-ink focus:outline-none focus:border-blood transition-colors"
                    />
                  </div>
                  {recError && <p className="font-mono text-[11px] text-blood">{recError}</p>}
                  <button
                    onClick={handleSalvaRecensione}
                    disabled={recStelle === 0 || recSaving}
                    className="bg-ink text-paper px-6 py-2.5 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {recSaving ? "Salvataggio…" : "Pubblica recensione"}
                  </button>
                </div>
              )
            ) : (
              <div className="mt-6 border border-ink/15 bg-paper p-4 text-center">
                <p className="font-serif italic text-ink/60 text-sm">Registrati per lasciare una recensione.</p>
                <Link
                  to="/auth/"
                  search={{ returnTo: `/leggi/${book.slug}` }}
                  className="mt-3 inline-block bg-ink text-paper px-6 py-2 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors"
                >
                  Accedi o registrati
                </Link>
              </div>
            )}

            {/* Lista recensioni */}
            {recensioni.length > 0 && (
              <div className="mt-8 space-y-5 border-t border-ink/10 pt-6">
                {recensioni.map(r => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`text-sm ${i < r.stelle ? "text-blood" : "text-ink/25"}`}>
                              {i < r.stelle ? "★" : "☆"}
                            </span>
                          ))}
                        </div>
                        <span className="font-display tracking-widest text-[10px] uppercase text-ink/60">
                          {r.nome_display ?? "Lettore"}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-ink/30 shrink-0">
                        {new Date(r.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {r.testo && <p className="font-serif italic text-sm text-ink/70 leading-relaxed">{r.testo}</p>}
                    <div className="border-b border-ink/8 pt-3" />
                  </div>
                ))}
              </div>
            )}
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
