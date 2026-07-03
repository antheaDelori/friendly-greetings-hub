import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida/gestione")({
  head: () => ({
    meta: [
      { title: "Guida gestione opere — Liberiamo la mente" },
      { name: "description", content: "Come creare e organizzare le tue opere nella pagina di gestione." },
    ],
  }),
  component: GuidaGestionePage,
});

const SEZIONI = [
  {
    icon: "◆",
    label: "Nuova opera",
    desc: "Clicca \"+ NUOVA OPERA\" sopra l'elenco per aprire il form. Compila almeno titolo, genere e descrizione, poi salva: comparirà nell'elenco \"Le tue opere\".",
  },
  {
    icon: "◈",
    label: "Modificare un'opera",
    desc: "Seleziona il titolo dall'elenco \"Le tue opere\" per aprirla in modifica. Da lì puoi anche archiviarla o spostarla nel cestino.",
  },
  {
    icon: "✦",
    label: "Generi e limiti",
    desc: "In fase beta puoi pubblicare gratis 1 opera (libro, racconto, saggio…) più 5 articoli e 5 poesie. Per sbloccare fino a 5 opere scrivi a info@liberiamo2076.com indicando nome e titolo.",
  },
  {
    icon: "◊",
    label: "Opere e Collane",
    desc: "Un'opera è un singolo testo. Una collana raggruppa più opere da leggere in un ordine preciso (es. una serie). Le due sezioni si gestiscono separatamente: CREA/MODIFICA per le collane, + NUOVA OPERA per i testi singoli.",
  },
  {
    icon: "⊗",
    label: "Cestino degli Scritti Perduti",
    desc: "Se invece di eliminare un'opera la sposti nel Cestino, resta visibile al pubblico: i lettori possono leggerla e votare per farla tornare in catalogo. Puoi ripristinarla tu stesso in qualsiasi momento.",
  },
  {
    icon: "✕",
    label: "Archiviare o eliminare",
    desc: "\"Archivia\" nasconde l'opera dal catalogo ma resta recuperabile in ogni momento. \"Elimina definitivamente\" la cancella senza possibilità di recupero — usalo con attenzione.",
  },
];

function GuidaGestionePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// GUIDA/GESTIONE"
        title="Gestire le tue opere"
        subtitle="Come orientarti nella pagina di gestione: creare, modificare, organizzare."
      >
        <div className="mb-8">
          <Link
            to="/gestione"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna alla gestione
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
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
          <p className="font-serif italic text-bone/50 text-sm leading-relaxed max-w-2xl mx-auto">
            Non trovi quello che cerchi? Scrivi a{" "}
            <a href="mailto:info@liberiamo2076.com" className="text-cyan hover:underline">info@liberiamo2076.com</a>.
          </p>
          <div className="mt-4 flex justify-center">
            <Link to="/gestione" className="font-mono text-[10px] uppercase tracking-widest text-magenta/70 hover:text-magenta border-b border-magenta/20 hover:border-magenta pb-0.5 transition-all">
              ▸ Torna alla gestione
            </Link>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
