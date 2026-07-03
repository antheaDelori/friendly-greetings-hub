import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida/catalogo")({
  head: () => ({
    meta: [
      { title: "Guida catalogo — Liberiamo la mente" },
      { name: "description", content: "Come orientarti nel catalogo: cerca, filtra, ordina, leggi." },
    ],
  }),
  component: GuidaCatalogoPage,
});

const SEZIONI = [
  { icon: "◉", label: "Cerca", desc: "Usa la barra sopra per trovare titoli, autori o argomenti. Premi INVIO o il tasto CERCA." },
  { icon: "◈", label: "Filtra per genere", desc: "Sotto la barra trovi i filtri: Libri, Articoli, Fumetti, Illustrati... Cliccane uno per restringere il catalogo." },
  { icon: "◆", label: "Ordina", desc: "Scegli tra Più recenti, Più letti, Top rated o Anno di pubblicazione." },
  { icon: "▸", label: "Leggi", desc: "Clicca su qualsiasi opera per aprirla. La lettura è sempre gratuita e completa — nessun estratto tagliato." },
  { icon: "◊", label: "Collane", desc: "Alcune opere fanno parte di serie tematiche. Usa il filtro COLLANE per leggerle nell'ordine dell'autore." },
  { icon: "✦", label: "Vuoi fare di più?", desc: "Registrandoti puoi salvare segnalibri, lasciare recensioni e seguire gli autori che ami.", link: "/auth", linkLabel: "Registrati gratis →" },
];

function GuidaCatalogoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// GUIDA/CATALOGO"
        title="Orientarti nel catalogo"
        subtitle="Cerca, filtra, ordina, leggi. Ecco come funziona l'indice olografico."
      >
        <div className="mb-8">
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna al catalogo
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
            <Link to="/catalogo" className="font-mono text-[10px] uppercase tracking-widest text-magenta/70 hover:text-magenta border-b border-magenta/20 hover:border-magenta pb-0.5 transition-all">
              ▸ Torna al catalogo
            </Link>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
