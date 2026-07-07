import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida/area-autore")({
  head: () => ({
    meta: [
      { title: "Guida area riservata — Liberiamo la mente" },
      { name: "description", content: "Come orientarti nella tua area riservata: opere, statistiche, profilo, tessera." },
    ],
  }),
  component: GuidaAreaAutorePage,
});

const SEZIONI = [
  { icon: "▣", label: "Tessera autore", desc: "Il pulsante in alto apre la tua tessera personale con nome e numero progressivo — puoi anche stamparla." },
  { icon: "▸", label: "Gestisci opere", desc: "Ti porta alla sezione dove pubblichi, modifichi e organizzi i tuoi libri, capitoli e copertine." },
  { icon: "◆", label: "Statistiche dettagliate", desc: "Letture, download e andamento delle tue opere nel tempo, opera per opera." },
  { icon: "◈", label: "Profilo autore", desc: "La tua biografia e i generi in cui scrivi — quello che i lettori vedono di te." },
  { icon: "◊", label: "Recensioni e accessi", desc: "Le ultime recensioni ricevute (puoi rispondere direttamente) e il registro degli ultimi accessi al tuo account." },
  { icon: "✦", label: "Vuoi fare di più?", desc: "Da qui puoi anche esportare le tue opere in PDF e tenere sotto controllo tutto il tuo canale in un colpo d'occhio." },
];

function GuidaAreaAutorePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// GUIDA/AREA RISERVATA"
        title="Orientarti nella tua area riservata"
        subtitle="Il centro di controllo del tuo canale: opere, statistiche, profilo e tessera in un solo posto."
      >
        <div className="mb-8">
          <Link
            to="/area-autore"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna all'area riservata
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {SEZIONI.map(({ icon, label, desc }) => (
            <div key={label} className="flex gap-3 glass border border-cyan/10 p-4">
              <span className="font-display text-xl text-cyan/40 flex-shrink-0 mt-0.5">{icon}</span>
              <div>
                <div className="font-mono text-[9px] tracking-[0.2em] text-cyan/70 uppercase mb-1">{label}</div>
                <p className="font-serif text-sm text-bone/65 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="glass border border-cyan/10 p-6 text-center">
          <div className="flex justify-center">
            <Link to="/area-autore" className="font-mono text-[10px] uppercase tracking-widest text-magenta/70 hover:text-magenta border-b border-magenta/20 hover:border-magenta pb-0.5 transition-all">
              ▸ Torna all'area riservata
            </Link>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
