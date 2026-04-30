import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getBookBySlug } from "@/data/books";

export const Route = createFileRoute("/leggi/$slug")({
  loader: ({ params }) => {
    const book = getBookBySlug(params.slug);
    if (!book) throw notFound();
    return { book };
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

function ReadPage() {
  const { book } = Route.useLoaderData();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const chapter = book.chapters[currentIdx];

  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <SiteHeader />

      {/* Header opera */}
      <section className="border-b border-ink/10 bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-8 flex flex-col md:flex-row gap-8 items-start">
          <img src={book.cover} alt="" className="w-32 md:w-40 aspect-[3/4] object-cover ring-1 ring-ink/15 shrink-0" />
          <div className="flex-1">
            <div className="font-display tracking-[0.25em] text-xs text-blood uppercase">{book.genre} · {book.year}</div>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl text-ink leading-tight">{book.title}</h1>
            <p className="mt-2 font-serif italic text-lg text-ink/70">di {book.author}</p>
            <p className="mt-4 font-serif text-base text-ink/80 max-w-2xl">{book.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 font-display tracking-widest text-xs uppercase hover:bg-blood transition-colors">
                ↓ Scarica
              </button>
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
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="font-display tracking-[0.2em] text-xs text-ink/50 mb-4">— capitoli</div>
          <ol className="space-y-1">
            {book.chapters.map((c, i) => (
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

        {/* Testo */}
        <article>
          <div className="font-display tracking-[0.25em] text-xs text-blood">capitolo {currentIdx + 1} di {book.chapters.length}</div>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl text-ink">{chapter.title}</h2>

          {/* progress */}
          <div className="mt-6 h-[2px] bg-ink/10 relative">
            <div className="absolute inset-y-0 left-0 bg-blood" style={{ width: `${((currentIdx + 1) / book.chapters.length) * 100}%` }} />
          </div>

          <div
            className="mt-10 font-serif text-ink/90 leading-[1.8] space-y-6 max-w-prose"
            style={{ fontSize: `${1.125 * fontScale}rem` }}
          >
            {chapter.content.map((p, i) => (
              <p key={i} className={i === 0 ? "first-letter:font-display first-letter:text-7xl first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-blood" : ""}>
                {p}
              </p>
            ))}
          </div>

          {/* Nav */}
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

          {/* Community placeholder */}
          <div className="mt-16 border-2 border-ink p-6 md:p-8 bg-card">
            <div className="font-display tracking-[0.25em] text-xs text-blood">— community</div>
            <h3 className="mt-2 font-serif text-2xl text-ink">Cosa ne pensi di questo capitolo?</h3>
            <p className="mt-2 font-serif text-ink/70">Lascia un commento, una recensione o segui l'autore. (Disponibile dopo il login — Step 2.)</p>
            <textarea
              placeholder="Scrivi un commento al capitolo..."
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
