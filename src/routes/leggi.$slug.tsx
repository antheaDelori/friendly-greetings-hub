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
      return { book: staticBook, fileUrl: null as string | null, isLoggedIn: !!session, isAnonymous: session?.user?.is_anonymous ?? false };
    }

    // Poi cerca su Supabase
    const { data } = await supabase
      .from("books")
      .select("id, slug, titolo, descrizione, estratto, genere, anno, letture, copertina_url, file_url, author_name")
      .eq("slug", params.slug)
      .eq("disponibile", true)
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

    const { data: { session } } = await supabase.auth.getSession();
    return { book, fileUrl: data.file_url as string | null, isLoggedIn: !!session, isAnonymous: session?.user?.is_anonymous ?? false };
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

function ReadPage() {
  const { book, fileUrl, isLoggedIn, isAnonymous } = Route.useLoaderData();
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [resumeBanner, setResumeBanner] = useState(false);
  const savedIdxRef = useRef<number>(0);

  const bookmarkKey = `reading_pos_${book.slug}`;

  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

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
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 4000);
    } catch (e) {
      console.error("Download error:", e);
      alert("Errore nel download. Riprova.");
    } finally {
      setDownloading(false);
    }
  };

  // Leggi il segnalibro salvato al mount
  useEffect(() => {
    if (!isLoggedIn) return;
    const saved = localStorage.getItem(bookmarkKey);
    if (!saved) return;
    const { chapterIdx } = JSON.parse(saved) as { chapterIdx: number };
    if (chapterIdx > 0 && chapterIdx < book.chapters.length) {
      savedIdxRef.current = chapterIdx;
      setResumeBanner(true);
    }
  }, []);

  // Salva la posizione quando cambia capitolo
  useEffect(() => {
    if (!isLoggedIn || book.chapters.length === 0) return;
    localStorage.setItem(bookmarkKey, JSON.stringify({ chapterIdx: currentIdx }));
  }, [currentIdx, isLoggedIn]);

  const hasChapters = book.chapters.length > 0;
  const chapter = hasChapters ? book.chapters[currentIdx] : null;

  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <SiteHeader />

      {/* Breadcrumb back */}
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-10 pt-5">
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1.5 font-display tracking-widest text-[10px] uppercase text-ink/40 hover:text-ink transition-colors"
        >
          ← Indietro
        </button>
      </div>

      {/* Header opera */}
      <section className="border-b border-ink/10 bg-card mt-3">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-8 flex flex-col md:flex-row gap-8 items-start">
          <img src={book.cover} alt="" className="w-32 md:w-40 aspect-[3/4] object-contain ring-1 ring-ink/15 shrink-0 bg-ink/5" />
          <div className="flex-1">
            <div className="font-display tracking-[0.25em] text-xs text-blood uppercase">{book.genre} · {book.year}</div>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl text-ink leading-tight">{book.title}</h1>
            <p className="mt-2 font-serif italic text-lg text-ink/70">di {book.author}</p>
            <p className="mt-4 font-serif text-base text-ink/80 max-w-2xl">{book.description}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {fileUrl && isLoggedIn && !isAnonymous ? (
                <>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {downloading ? "↓ Scaricamento…" : "↓ Scarica"}
                  </button>
                  {downloadDone && (
                    <span className="font-mono text-[10px] tracking-widest text-cyan animate-pulse">
                      ✓ File aperto in una nuova scheda — salvalo dal visualizzatore
                    </span>
                  )}
                </>
              ) : fileUrl && isLoggedIn && isAnonymous ? (
                <Link
                  to="/auth/"
                  search={{ returnTo: `/leggi/${book.slug}` }}
                  className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors"
                  title="Registrati per scaricare il file"
                >
                  ↓ Scarica (registrati)
                </Link>
              ) : fileUrl && !isLoggedIn ? (
                <Link
                  to="/auth/"
                  search={{ returnTo: `/leggi/${book.slug}` }}
                  className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors"
                >
                  ↓ Scarica (accedi)
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 bg-ink/20 text-ink/40 px-4 py-2 font-display tracking-widest text-xs uppercase cursor-not-allowed">
                  ↓ File non disponibile
                </span>
              )}
              <button className="inline-flex items-center gap-2 border border-ink text-ink px-4 py-2 font-display tracking-widest text-xs uppercase hover:bg-ink hover:text-paper transition-colors">
                ★ Recensisci
              </button>
              <button className="inline-flex items-center gap-2 border border-blood text-blood px-4 py-2 font-display tracking-widest text-xs uppercase hover:bg-blood hover:text-paper transition-colors">
                ♥ Sostieni l'autore
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Lettore */}
      <section className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-10 py-10 grid lg:grid-cols-[260px_1fr] gap-10 flex-1">

        {/* Sidebar capitoli */}
        {hasChapters && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="font-display tracking-[0.2em] text-xs text-ink/50 mb-4">— capitoli</div>
            <ol className="space-y-1">
              {book.chapters.map((c: { id: string; title: string; content: string[] }, i: number) => (
                <li key={c.id}>
                  <button
                    onClick={() => setCurrentIdx(i)}
                    className={`w-full text-left px-3 py-2 font-serif text-base transition-colors border-l-2 ${
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

            <div className="mt-8 border-t border-ink/10 pt-6">
              <div className="font-display tracking-[0.2em] text-xs text-ink/50 mb-3">— testo</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setFontScale((s) => Math.max(0.85, s - 0.1))} className="font-serif text-sm border border-ink/20 px-3 py-1 hover:border-ink">A−</button>
                <button onClick={() => setFontScale(1)} className="font-serif text-sm border border-ink/20 px-3 py-1 hover:border-ink">A</button>
                <button onClick={() => setFontScale((s) => Math.min(1.4, s + 0.1))} className="font-serif text-lg border border-ink/20 px-3 py-1 hover:border-ink">A+</button>
              </div>
            </div>
          </aside>
        )}

        {/* Testo */}
        <article className={!hasChapters ? "lg:col-span-2" : ""}>
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

          {!isLoggedIn ? (
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
                <div className="font-display tracking-[0.25em] text-xs text-blood">capitolo {currentIdx + 1} di {book.chapters.length}</div>
                <div className="font-display tracking-[0.2em] text-xs text-ink/30">{chapterReadingTime(chapter)}</div>
              </div>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl text-ink">{chapter.title}</h2>

              <div className="mt-6 h-[2px] bg-ink/10 relative">
                <div className="absolute inset-y-0 left-0 bg-blood" style={{ width: `${((currentIdx + 1) / book.chapters.length) * 100}%` }} />
              </div>

              {chapter.isHtml ? (
                <div
                  className="mt-10 font-serif text-ink/90 leading-[1.65] max-w-prose chapter-prose"
                  style={{ fontSize: `${1.0 * fontScale}rem` }}
                  dangerouslySetInnerHTML={{ __html: chapter.content[0] }}
                />
              ) : (
                <div
                  className="mt-10 font-serif text-ink/90 leading-[1.8] space-y-6 max-w-prose"
                  style={{ fontSize: `${1.0 * fontScale}rem` }}
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
    </div>
  );
}
