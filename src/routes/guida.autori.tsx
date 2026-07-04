import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida/autori")({
  head: () => ({
    meta: [
      { title: "Guida autori — Liberiamo la mente" },
      { name: "description", content: "Come orientarti nella pagina di un autore: filtra, ordina, leggi le sue serie." },
    ],
  }),
  component: GuidaAutoriPage,
});

const SEZIONI = [
  { icon: "◈", label: "Filtra per genere", desc: "In alto trovi tutti i generi in cui l'autore ha pubblicato. Cliccane uno per restringere le sue opere." },
  { icon: "◆", label: "Ordina", desc: "Scegli tra Più recenti, Più letti, Top rated o Anno di pubblicazione." },
  { icon: "▸", label: "Leggi", desc: "Clicca su qualsiasi opera per aprirla. La lettura è sempre gratuita e completa — nessun estratto tagliato." },
  { icon: "◊", label: "Collane", desc: "Se l'autore ha scritto una serie, usa il filtro COLLANE per leggerla nell'ordine giusto." },
  { icon: "←", label: "Cambia autore", desc: "Usa \"Tutti gli autori\" in alto a destra per tornare all'elenco completo." },
  { icon: "✦", label: "Vuoi fare di più?", desc: "Registrandoti puoi salvare segnalibri, lasciare recensioni e seguire gli autori che ami.", link: "/auth", linkLabel: "Registrati gratis →" },
];

function GuidaAutoriPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// GUIDA/AUTORI"
        title="Orientarti nella pagina autore"
        subtitle="Genere, ordine, collane: tutte le opere di un autore in un solo posto."
      >
        <div className="mb-8">
          <Link
            to="/autori"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna agli autori
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {SEZIONI.map(({ icon, label, desc, link, linkLabel }) => (
            <div key={label} className="flex gap-3 glass border border-cyan/10 p-4">
              <span className="font-display text-xl text-cyan/40 flex-shrink-0 mt-0.5">{icon}</span>
              <div>
                <div className="font-mono text-[9px] tracking-[0.2em] text-cyan/70 uppercase mb-1">{label}</div>
                <p className="font-serif text-sm text-bone/65 leading-relaxed">{desc}</p>
                {link && <Link to={link} className="mt-2 inline-block font-mono text-[9px] tracking-widest text-magenta hover:text-magenta/70 uppercase">{linkLabel}</Link>}
              </div>
            </div>
          ))}
        </div>

        <div className="glass border border-cyan/10 p-6 text-center">
          <div className="flex justify-center">
            <Link to="/autori" className="font-mono text-[10px] uppercase tracking-widest text-magenta/70 hover:text-magenta border-b border-magenta/20 hover:border-magenta pb-0.5 transition-all">
              ▸ Torna agli autori
            </Link>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
