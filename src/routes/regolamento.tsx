import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/regolamento")({
  head: () => ({
    meta: [
      { title: "Regolamento — Liberiamo la mente" },
      { name: "description", content: "Diritti d'autore, moderazione e regole di download della biblioteca olografica Liberiamo la mente." },
      { property: "og:title", content: "Regolamento — Liberiamo la mente" },
      { property: "og:description", content: "Le regole della biblioteca: diritti, moderazione, download." },
    ],
  }),
  component: RegolamentoPage,
});

function RegolamentoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// MODULE/RULES.txt"
        title="Regolamento"
        subtitle="Le tre leggi che tengono in piedi questa biblioteca. Trasparenti, brevi, immutabili."
      >
        <div className="grid md:grid-cols-3 gap-6">
          <HudPanel label="art. 01 — diritti d'autore" code="§§ 01" tone="cyan">
            <h3 className="font-display text-2xl text-bone tracking-tight">Chi scrive comanda</h3>
            <ul className="mt-5 space-y-3 font-serif text-bone/80 leading-relaxed">
              <li>▸ I diritti restano <span className="text-cyan">interamente all'autore</span>.</li>
              <li>▸ L'autore decide cosa rendere scaricabile (PDF, e-book) e cosa solo leggibile online.</li>
              <li>▸ Riproduzione vietata senza consenso esplicito.</li>
            </ul>
          </HudPanel>

          <HudPanel label="art. 02 — moderazione" code="§§ 02" tone="magenta">
            <h3 className="font-display text-2xl text-bone tracking-tight">Niente rumore tossico</h3>
            <ul className="mt-5 space-y-3 font-serif text-bone/80 leading-relaxed">
              <li>▸ Contenuti offensivi, spam o disinformazione vengono <span className="text-magenta">rimossi entro 24h</span>.</li>
              <li>▸ Segnalazioni utenti tracciate in modo trasparente.</li>
              <li>▸ Tre violazioni = sospensione account.</li>
            </ul>
          </HudPanel>

          <HudPanel label="art. 03 — download" code="§§ 03" tone="amber">
            <h3 className="font-display text-2xl text-bone tracking-tight">Permessi e limiti</h3>
            <ul className="mt-5 space-y-3 font-serif text-bone/80 leading-relaxed">
              <li>▸ Solo utenti registrati possono scaricare.</li>
              <li>▸ Massimo <span className="text-amber">5 download al giorno</span> per lettore.</li>
              <li>▸ Le opere dei donatori non hanno limite.</li>
            </ul>
          </HudPanel>
        </div>

        <div className="mt-10 glass p-8 hud-frame-x">
          <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// nota_finale</div>
          <p className="mt-3 font-serif italic text-xl text-bone/80 max-w-3xl leading-relaxed">
            Questo regolamento può essere aggiornato. Quando succede, te lo diciamo. Niente clausole
            nascoste in caratteri da formica. <span className="text-magenta not-italic font-mono text-sm tracking-widest">read.or.perish</span>
          </p>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
