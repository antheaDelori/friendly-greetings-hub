import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { books } from "@/data/books";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Liberiamo la mente" },
      { name: "description", content: "Recensioni, commenti, autori da seguire. La spina dorsale della biblioteca olografica." },
    ],
  }),
  component: CommunityPage,
});

const reviews = [
  { user: "@anthea_dl", book: "Read or Perish", text: "Un saggio che ti tira fuori dal letto alle 4 e mezza. Tagliente come un cristallo.", time: "2h fa", rate: 5 },
  { user: "@marco_r", book: "Il silenzio delle pagine", text: "La bibliotecaria clandestina è il personaggio dell'anno. Capitolo III mi ha fermato.", time: "8h fa", rate: 5 },
  { user: "@iris_c", book: "Geografie private", text: "Le mappe come metafora funzionano. La struttura forse poteva osare di più.", time: "1g fa", rate: 4 },
  { user: "@tommaso_b", book: "Lessico della rivolta", text: "Cento parole, cento bisturi. Da tenere sul comodino.", time: "2g fa", rate: 5 },
];

function CommunityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/COMMUNITY" title="Community" subtitle="Niente like sterili. Solo persone che leggono e dicono cosa pensano.">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Feed */}
          <div className="space-y-4">
            <HudPanel label="ultime_recensioni" tone="cyan">
              <div className="space-y-5">
                {reviews.map((r, i) => (
                  <div key={i} className="border-l-2 border-cyan/40 pl-4 hover:border-magenta transition-colors">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div>
                        <span className="font-mono text-cyan text-sm">{r.user}</span>
                        <span className="font-mono text-[10px] tracking-widest text-bone/40 uppercase ml-3">▸ {r.book}</span>
                      </div>
                      <div className="font-mono text-[10px] tracking-widest text-bone/40">{r.time} · {"★".repeat(r.rate)}</div>
                    </div>
                    <p className="mt-2 font-serif italic text-bone/85 leading-relaxed">"{r.text}"</p>
                  </div>
                ))}
              </div>
            </HudPanel>

            <HudPanel label="aggiungi_recensione" tone="magenta">
              <h3 className="font-display text-xl text-bone tracking-tight">Lascia la tua</h3>
              <textarea
                placeholder="Cosa ne pensi del libro o del capitolo?"
                className="mt-4 w-full min-h-28 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-magenta transition-all"
              />
              <div className="mt-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} className="font-display text-2xl text-amber/40 hover:text-amber transition-colors">★</button>
                  ))}
                </div>
                <HudButton variant="magenta">◆ Pubblica</HudButton>
              </div>
            </HudPanel>
          </div>

          {/* Autori da seguire */}
          <div className="space-y-4">
            <HudPanel label="autori_attivi" code="LIVE" tone="amber">
              <ul className="space-y-3">
                {books.slice(0, 5).map((b) => (
                  <li key={b.slug} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan/40 to-magenta/30 ring-1 ring-cyan/40 flex items-center justify-center font-display text-bone">
                      {b.author[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm text-bone truncate">{b.author}</div>
                      <div className="font-mono text-[9px] tracking-widest text-bone/50 uppercase">▸ {b.genre}</div>
                    </div>
                    <button className="font-mono text-[10px] tracking-widest text-cyan border border-cyan/40 px-2 py-1 hover:bg-cyan hover:text-void transition-all uppercase">
                      +seg
                    </button>
                  </li>
                ))}
              </ul>
            </HudPanel>

            <HudPanel label="trending" tone="cyan">
              <ul className="space-y-2 font-mono text-xs text-bone/70">
                <li>#01 ▸ <span className="text-cyan">read or perish</span></li>
                <li>#02 ▸ silenzio delle pagine</li>
                <li>#03 ▸ <span className="text-magenta">manuale del disertore</span></li>
                <li>#04 ▸ controcanto</li>
                <li>#05 ▸ lessico della rivolta</li>
              </ul>
            </HudPanel>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
