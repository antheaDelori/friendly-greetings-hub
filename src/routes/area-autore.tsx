import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudInput, HudButton } from "@/components/HudPanel";
import { books } from "@/data/books";

export const Route = createFileRoute("/area-autore")({
  head: () => ({
    meta: [
      { title: "Area riservata autore — Liberiamo la mente" },
      { name: "description", content: "Statistiche, KPI, mailing list e gestione opere per l'autore registrato." },
    ],
  }),
  component: AreaAutorePage,
});

function AreaAutorePage() {
  const myBooks = books.slice(0, 3);
  const kpis = [
    { label: "accessi", value: 18420, c: "text-cyan", sub: "ultimi 30g" },
    { label: "download", value: 942, c: "text-magenta", sub: "PDF + e-book" },
    { label: "bozze private", value: 4, c: "text-amber", sub: "non pubblicate" },
    { label: "rilasci futuri", value: 2, c: "text-bone", sub: "in coda" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/AUTHOR_DASH" title="Area riservata" subtitle="Centro di controllo del tuo channel. Statistiche, lettori, opere — tutto in un colpo d'occhio.">
        {/* KPI grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => (
            <div key={k.label} className="glass p-5 hud-frame relative scan-sweep">
              <div className="font-mono text-[10px] tracking-widest text-bone/50 uppercase">// {k.label}</div>
              <div className={`mt-3 font-display text-5xl tracking-tight ${k.c}`}>
                {k.value.toLocaleString("it-IT")}
              </div>
              <div className="mt-2 font-mono text-[9px] tracking-widest text-bone/40 uppercase">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Statistiche dettaglio */}
          <HudPanel label="trend_letture" code="↗ +12%" tone="cyan" className="lg:col-span-2">
            <h3 className="font-display text-xl text-bone tracking-tight">Andamento letture · 12 settimane</h3>
            <div className="mt-6 flex items-end gap-1 h-40">
              {[20, 35, 28, 42, 38, 55, 48, 62, 70, 65, 80, 92].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-cyan/30 to-cyan/80 hover:to-magenta transition-colors"
                    style={{ height: `${h}%` }}
                  />
                  <div className="font-mono text-[8px] text-bone/40">w{i + 1}</div>
                </div>
              ))}
            </div>
          </HudPanel>

          {/* Mailing list */}
          <HudPanel label="mailing_list" code="124 sub" tone="magenta">
            <h3 className="font-display text-xl text-bone tracking-tight">Iscritti</h3>
            <div className="mt-4 space-y-2 font-mono text-[11px] text-bone/70 max-h-44 overflow-y-auto">
              {["antheaDelori@live.it", "marco.r@holo.net", "iris@conforti.io", "tommaso.b@uplink", "sara.v@books", "giulia@reads", "leo@notte"].map((m) => (
                <div key={m} className="flex items-center justify-between border-b border-cyan/10 pb-1">
                  <span>▸ {m}</span>
                  <span className="text-cyan/50 text-[9px]">ON</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full font-mono text-[10px] tracking-widest text-magenta uppercase border border-magenta/40 py-2 hover:bg-magenta/10 transition-colors">
              ◆ Invia newsletter
            </button>
          </HudPanel>

          {/* Le mie opere */}
          <HudPanel label="le_mie_opere" code={`${myBooks.length} pub`} tone="amber" className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-bone tracking-tight">Catalogo personale</h3>
              <Link to="/gestione" className="font-mono text-[10px] tracking-widest text-amber uppercase hover:text-cyan transition-colors">
                ▸ gestisci
              </Link>
            </div>
            <ul className="mt-5 space-y-3">
              {myBooks.map((b) => (
                <li key={b.slug} className="flex items-center gap-4 border border-cyan/15 p-3 hover:border-cyan/40 transition-colors">
                  <img src={b.cover} alt="" className="w-12 h-16 object-cover ring-1 ring-cyan/30" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-bone truncate">{b.title}</div>
                    <div className="font-mono text-[9px] tracking-widest text-bone/40 uppercase">{b.genre} · {b.year}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-cyan">{b.reads.toLocaleString("it-IT")}</div>
                    <div className="font-mono text-[9px] text-bone/40 tracking-widest">READS</div>
                  </div>
                </li>
              ))}
            </ul>
          </HudPanel>

          {/* Ricerche DB */}
          <HudPanel label="db_query" tone="cyan">
            <h3 className="font-display text-xl text-bone tracking-tight">Ricerche a DB</h3>
            <p className="mt-3 font-serif italic text-sm text-bone/65">Cerca tra commenti, recensioni, lettori che ti seguono.</p>
            <div className="mt-4 space-y-3">
              <HudInput label="query" placeholder="es. capitolo 3 'splendore'" />
              <HudButton variant="primary" type="button" className="w-full">▸ Esegui</HudButton>
            </div>
          </HudPanel>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
