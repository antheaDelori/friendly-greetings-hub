import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { getBookBySlug } from "@/data/books";

export const Route = createFileRoute("/community/")({
  loader: ({ params }) => {
    const book = getBookBySlug(params.slug);
    if (!book) throw notFound();
    return { book };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `Community: ${loaderData.book.title} — Liberiamo la mente` },
      { name: "description", content: `Recensioni e discussioni su "${loaderData.book.title}" di ${loaderData.book.author}.` },
    ] : [],
  }),
  notFoundComponent: () => <div className="p-20 text-center text-bone">Opera non trovata.</div>,
  component: BookCommunity,
});

function BookCommunity() {
  const { book } = Route.useLoaderData();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code={`// COMMUNITY/${book.slug.toUpperCase()}`} title={book.title} subtitle={`Discussione attorno all'opera di ${book.author}.`}>
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <HudPanel label="opera" tone="cyan">
            <img src={book.cover} alt="" className="w-full aspect-[3/4] object-cover ring-1 ring-cyan/30 hud-frame" />
            <p className="mt-4 font-serif italic text-sm text-bone/70">{book.tagline}</p>
            <div className="hud-divider my-4" />
            <Link to="/leggi/$slug" params={{ slug: book.slug }}>
              <HudButton variant="primary" className="w-full">▸ Leggi</HudButton>
            </Link>
            <button className="mt-3 w-full font-mono text-[10px] tracking-widest text-magenta uppercase border border-magenta/40 py-2 hover:bg-magenta/10 transition-colors">
              ◆ Segui {book.author}
            </button>
          </HudPanel>

          <div className="space-y-6">
            <HudPanel label="commenta_libro" tone="magenta">
              <textarea
                placeholder={`Lascia la tua recensione su "${book.title}"...`}
                className="w-full min-h-28 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-magenta"
              />
              <div className="mt-3 flex justify-between items-center">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => <button key={s} className="text-amber/50 hover:text-amber text-xl">★</button>)}
                </div>
                <HudButton variant="magenta">▸ Invia</HudButton>
              </div>
            </HudPanel>

            <HudPanel label="commenti_per_capitolo" tone="cyan">
              <div className="space-y-4">
                {book.chapters.map((c, i) => (
                  <div key={c.id} className="border border-cyan/15 p-4 hover:border-cyan/40 transition-colors">
                    <div className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">// cap.{String(i+1).padStart(2,"0")}</div>
                    <div className="mt-1 font-display text-bone">{c.title}</div>
                    <button className="mt-2 font-mono text-[10px] tracking-widest text-magenta uppercase hover:text-cyan transition-colors">
                      ▸ commenta capitolo
                    </button>
                  </div>
                ))}
              </div>
            </HudPanel>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
