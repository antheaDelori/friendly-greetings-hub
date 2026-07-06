import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida/libri-aperti")({
  head: () => ({
    meta: [
      { title: "Guida Libri Aperti — Liberiamo la mente" },
      { name: "description", content: "Come funzionano le opere in scrittura: segui, leggi capitolo per capitolo, commenta." },
    ],
  }),
  component: GuidaLibriApertiPage,
});

const SEZIONI = [
  { icon: "✎", label: "Cosa sono", desc: "Opere ancora in scrittura: l'autore pubblica un capitolo alla volta, non serve aspettare il libro finito per iniziare a leggerlo." },
  { icon: "★", label: "Segui un libro", desc: "Premi SEGUI sulla pagina del libro per ricevere una email ogni volta che esce un nuovo capitolo. Richiede l'accesso." },
  { icon: "▸", label: "Leggi i capitoli", desc: "Clicca su un capitolo per aprirlo. Sono numerati nell'ordine in cui l'autore li ha pubblicati." },
  { icon: "◈", label: "Commenta", desc: "Sotto ogni capitolo puoi lasciare un commento: l'autore riceve una notifica email e può risponderti nei capitoli successivi." },
  { icon: "◆", label: "Quando l'opera finisce", desc: "Il badge passa da \"In scrittura\" a \"Completato\" — a quel punto il libro entra a tutti gli effetti nel catalogo generale." },
  { icon: "✦", label: "Vuoi fare di più?", desc: "Registrandoti puoi seguire libri, commentare i capitoli e salvare i tuoi preferiti.", link: "/auth", linkLabel: "Registrati gratis →" },
];

function GuidaLibriApertiPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// GUIDA/LIBRI APERTI"
        title="Orientarti tra le opere in scrittura"
        subtitle="Segui un libro mentre nasce, capitolo per capitolo, e commenta con l'autore."
      >
        <div className="mb-8">
          <Link
            to="/libri-aperti"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna a Libri Aperti
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
            <Link to="/libri-aperti" className="font-mono text-[10px] uppercase tracking-widest text-magenta/70 hover:text-magenta border-b border-magenta/20 hover:border-magenta pb-0.5 transition-all">
              ▸ Torna a Libri Aperti
            </Link>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
