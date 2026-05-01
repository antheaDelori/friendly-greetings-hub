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
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <div className="glass p-10 hud-frame max-w-md">
          <div className="font-display text-7xl text-magenta">!</div>
          <h1 className="mt-4 font-display text-3xl text-bone">Errore di lettura</h1>
          <p className="mt-2 font-serif italic text-bone/70">{error.message}</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mt-6 border border-cyan bg-cyan/10 text-cyan px-6 py-3 font-mono tracking-widest text-[10px] uppercase hover:bg-cyan hover:text-void transition-all"
          >▸ Riprova</button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function ReadNotFound() {
  const { slug } = Route.useParams();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <div className="glass p-10 hud-frame max-w-md">
          <div className="font-display text-8xl text-magenta">404</div>
          <h1 className="mt-2 font-display text-3xl text-bone">Opera non trovata</h1>
          <p className="mt-2 font-mono text-xs text-bone/60 tracking-widest">SLUG: {slug}</p>
          <Link to="/catalogo" className="mt-6 inline-block border border-cyan bg-cyan/10 text-cyan px-6 py-3 font-mono tracking-widest text-[10px] uppercase hover:bg-cyan hover:text-void transition-all">
            ▸ Torna al catalogo
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
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Header opera — HUD scuro */}
      <section className="relative scanlines border-b border-cyan/15">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-magenta/5 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-10 flex flex-col md:flex-row gap-8 items-start relative">
          <div className="relative shrink-0 hud-frame">
            <img src={book.cover} alt="" className="w-32 md:w-40 aspect-[3/4] object-cover ring-1 ring-cyan/40" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/20 to-magenta/15 mix-blend-overlay" />
          </div>
          <div className="flex-1">
            <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// {book.genre} · YR.{book.year}</div>
            <h1 className="mt-2 font-display text-4xl md:text-5xl text-bone leading-tight tracking-tight">{book.title}</h1>
            <p className="mt-2 font-serif italic text-lg text-bone/70">↳ di {book.author}</p>
            <p className="mt-4 font-serif text-base text-bone/75 max-w-2xl leading-relaxed">{book.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/download/$slug" params={{ slug: book.slug }} className="inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 text-cyan px-4 py-2 font-mono tracking-widest text-[10px] uppercase hover:bg-cyan hover:text-void transition-all">
                ↓ Scarica
              </Link>
              <Link to="/community/$slug" params={{ slug: book.slug }} className="inline-flex items-center gap-2 border border-magenta/60 bg-magenta/10 text-magenta px-4 py-2 font-mono tracking-widest text-[10px] uppercase hover:bg-magenta hover:text-void transition-all">
                ◆ Community
              </Link>
              <Link to="/donazioni" className="inline-flex items-center gap-2 border border-amber/60 bg-amber/10 text-amber px-4 py-2 font-mono tracking-widest text-[10px] uppercase hover:bg-amber hover:text-void transition-all">
                ♥ Sostieni
              </Link>
            </div>
          </div>
          <div className="hidden lg:block font-mono text-[9px] text-cyan/60 tracking-widest text-right">
            <div>READS: {book.reads.toLocaleString("it-IT")}</div>
            <div>RATE: {book.rating.toFixed(1)}/5.0</div>
            <div className="text-magenta mt-2">▸ STREAMING</div>
          </div>
        </div>
      </section>

      {/* Lettore */}
      <section className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-10 py-10 grid lg:grid-cols-[260px_1fr] gap-8 flex-1">
        {/* Sidebar capitoli */}
        <aside className="lg:sticky lg:top-28 lg:self-start glass p-5 hud-frame">
          <div className="font-mono tracking-[0.25em] text-[10px] text-cyan uppercase mb-4">// capitoli</div>
          <ol className="space-y-1">
            {book.chapters.map((c, i) => (
              <li key={c.id}>
                <button
                  onClick={() => setCurrentIdx(i)}
                  className={`w-full text-left px-3 py-2 font-serif text-[15px] transition-all border-l-2 ${
                    i === currentIdx
                      ? "border-magenta bg-magenta/10 text-bone"
                      : "border-transparent text-bone/55 hover:text-bone hover:border-cyan/50 hover:bg-cyan/5"
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-widest text-cyan/60 mr-2">{String(i + 1).padStart(2, "0")}</span>
                  {c.title}
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-6 pt-5 border-t border-cyan/15">
            <div className="font-mono tracking-[0.25em] text-[10px] text-cyan uppercase mb-3">// font_size</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setFontScale((s) => Math.max(0.85, s - 0.1))} className="font-serif text-sm border border-cyan/30 px-3 py-1.5 text-bone hover:bg-cyan/10 hover:border-cyan transition-colors flex-1">A−</button>
              <button onClick={() => setFontScale(1)} className="font-serif text-sm border border-cyan/30 px-3 py-1.5 text-bone hover:bg-cyan/10 hover:border-cyan transition-colors flex-1">A</button>
              <button onClick={() => setFontScale((s) => Math.min(1.4, s + 0.1))} className="font-serif text-lg border border-cyan/30 px-3 py-1.5 text-bone hover:bg-cyan/10 hover:border-cyan transition-colors flex-1">A+</button>
            </div>
          </div>
        </aside>

        {/* Testo — superficie chiara, riposante */}
        <article className="reader-surface p-8 md:p-12 relative">
          <span className="absolute top-3 left-3 w-3 h-3 border-l border-t border-cyan/70" />
          <span className="absolute top-3 right-3 w-3 h-3 border-r border-t border-cyan/70" />
          <span className="absolute bottom-3 left-3 w-3 h-3 border-l border-b border-cyan/70" />
          <span className="absolute bottom-3 right-3 w-3 h-3 border-r border-b border-cyan/70" />

          <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">
            // capitolo {String(currentIdx + 1).padStart(2, "0")} di {String(book.chapters.length).padStart(2, "0")}
          </div>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl text-void leading-tight">{chapter.title}</h2>

          {/* progress */}
          <div className="mt-6 h-[2px] bg-void/10 relative">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan to-magenta" style={{ width: `${((currentIdx + 1) / book.chapters.length) * 100}%` }} />
          </div>

          <div
            className="mt-10 font-serif text-void/85 leading-[1.85] space-y-6 max-w-prose"
            style={{ fontSize: `${1.125 * fontScale}rem` }}
          >
            {chapter.content.map((p, i) => (
              <p key={i} className={i === 0 ? "first-letter:font-display first-letter:text-7xl first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-magenta" : ""}>
                {p}
              </p>
            ))}
          </div>

          {/* Nav */}
          <div className="mt-16 flex items-center justify-between border-t border-void/10 pt-6">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="font-mono tracking-widest text-[10px] uppercase text-void/80 hover:text-magenta disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              ← prec
            </button>
            <span className="font-mono text-[10px] tracking-widest text-void/40">
              {String(currentIdx + 1).padStart(2, "0")} / {String(book.chapters.length).padStart(2, "0")}
            </span>
            <button
              disabled={currentIdx === book.chapters.length - 1}
              onClick={() => setCurrentIdx((i) => Math.min(book.chapters.length - 1, i + 1))}
              className="font-mono tracking-widest text-[10px] uppercase text-void/80 hover:text-magenta disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              succ →
            </button>
          </div>
        </article>
      </section>

      <SiteFooter />
    </div>
  );
}
