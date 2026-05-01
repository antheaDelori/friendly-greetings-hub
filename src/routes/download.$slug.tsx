import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { getBookBySlug } from "@/data/books";

export const Route = createFileRoute("/download/$slug")({
  loader: ({ params }) => {
    const book = getBookBySlug(params.slug);
    if (!book) throw notFound();
    return { book };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `Scarica: ${loaderData.book.title} — Liberiamo la mente` },
      { name: "description", content: `Scarica "${loaderData.book.title}" in PDF o e-book, oppure acquista la versione cartacea.` },
    ] : [],
  }),
  notFoundComponent: () => <div className="p-20 text-center text-bone">Opera non trovata.</div>,
  component: DownloadPage,
});

function DownloadPage() {
  const { book } = Route.useLoaderData();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code={`// DOWNLOAD/${book.slug.toUpperCase()}`} title={book.title} subtitle={`Trasferimento dati pronto. Scegli il formato e procedi.`}>
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <HudPanel label="opera" tone="cyan">
            <img src={book.cover} alt="" className="w-full aspect-[3/4] object-cover ring-1 ring-cyan/30 hud-frame" />
            <div className="mt-4 font-mono text-[9px] tracking-widest text-bone/50 uppercase space-y-1">
              <div>▸ AUTORE: <span className="text-cyan">{book.author}</span></div>
              <div>▸ ANNO: {book.year}</div>
              <div>▸ GENERE: {book.genre}</div>
              <div>▸ ID: {book.slug.slice(0,8).toUpperCase()}</div>
            </div>
          </HudPanel>

          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <HudPanel label="versione_pdf" tone="cyan" className="text-center">
                <div className="font-display text-6xl text-cyan text-glow-cyan">PDF</div>
                <p className="mt-3 font-serif italic text-bone/70">Formato fedele all'impaginazione originale.</p>
                <div className="mt-2 font-mono text-[10px] tracking-widest text-bone/40">~ 2.4 MB</div>
                <HudButton variant="primary" className="mt-5 w-full">↓ Scarica PDF</HudButton>
              </HudPanel>

              <HudPanel label="versione_ebook" tone="magenta" className="text-center">
                <div className="font-display text-6xl text-magenta text-glow-magenta">EPUB</div>
                <p className="mt-3 font-serif italic text-bone/70">Per liseuse e dispositivi mobili.</p>
                <div className="mt-2 font-mono text-[10px] tracking-widest text-bone/40">~ 980 KB</div>
                <HudButton variant="magenta" className="mt-5 w-full">↓ Scarica EPUB</HudButton>
              </HudPanel>
            </div>

            <HudPanel label="copia_cartacea" tone="amber">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl text-bone tracking-tight">Vuoi la carta vera?</h3>
                  <p className="mt-2 font-serif italic text-bone/70 max-w-md">
                    Stampa on-demand, copertina rigida, consegna in 7 giorni.
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl text-amber">€ 18,90</div>
                  <button className="mt-2 font-mono text-[10px] tracking-widest uppercase border border-amber bg-amber/10 text-amber px-5 py-2.5 hover:bg-amber hover:text-void transition-all">
                    ▸ Acquista
                  </button>
                </div>
              </div>
            </HudPanel>

            <HudPanel label="sostieni_autore" tone="magenta">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="font-serif italic text-lg text-bone/80">
                  Ti è piaciuto? <span className="text-magenta">Lascia una donazione libera all'autore.</span>
                </p>
                <Link to="/donazioni"><HudButton variant="magenta">♥ Fai una donazione</HudButton></Link>
              </div>
            </HudPanel>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
