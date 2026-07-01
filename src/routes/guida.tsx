import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida")({
  head: () => ({
    meta: [
      { title: "Guida — Liberiamo la mente" },
      { name: "description", content: "Come funziona la piattaforma: esploratore, lettore o autore." },
    ],
  }),
  component: GuidaPage,
});

const ACCESSI = [
  {
    code: "// accesso_01",
    label: "Esploratore",
    badge: "Senza registrazione",
    badgeTone: "cyan",
    icon: "◌",
    tagline: "Entra, guarda, poi decidi.",
    description:
      "Non serve un account. Puoi sfogliare il catalogo, vedere le copertine, leggere le sinossi e gli estratti. È il modo più rapido per capire se la piattaforma fa per te.",
    puoi: [
      "Sfogliare il catalogo completo",
      "Leggere estratti e sinossi",
      "Scoprire autori e collane",
    ],
    nonPuoi: [
      "Leggere le opere complete",
      "Salvare segnalibri o libreria",
      "Lasciare recensioni",
      "Seguire autori",
    ],
    cta: { label: "Entra nel catalogo →", to: "/catalogo" },
    tone: "border-cyan/30",
    iconTone: "text-cyan/40",
  },
  {
    code: "// accesso_02",
    label: "Lettore",
    badge: "Gratuito",
    badgeTone: "cyan",
    icon: "◈",
    tagline: "Leggi tutto. Gratis.",
    description:
      "Registrati in 30 secondi con email e password. Accedi all'intero catalogo, costruisci la tua libreria personale, lascia recensioni e segui gli autori che ami. Ricevi una notifica ogni volta che pubblicano qualcosa di nuovo.",
    puoi: [
      "Leggere tutte le opere in catalogo",
      "Salvare segnalibri nel testo",
      "Aggiungere opere alla libreria",
      "Lasciare recensioni con voto",
      "Seguire autori e ricevere notifiche",
      "Partecipare ai Libri Aperti",
    ],
    nonPuoi: [
      "Pubblicare opere proprie",
    ],
    cta: { label: "Registrati gratis →", to: "/auth" },
    tone: "border-cyan/30",
    iconTone: "text-cyan/70",
  },
  {
    code: "// accesso_03",
    label: "Autore",
    badge: "€12 / anno",
    badgeTone: "magenta",
    icon: "◆",
    tagline: "Pubblica. Connettiti. Rimani.",
    description:
      "Tutto quello che ha il Lettore, più la possibilità di pubblicare le tue opere — libri, racconti, articoli, saggi, fumetti, illustrati. Crei la tua pagina autore, gestisci la tua lista lettori e invii newsletter dirette. Un euro al mese per tenere la piattaforma indipendente.",
    puoi: [
      "Pubblicare libri, racconti, articoli, saggi",
      "Pubblicare fumetti e illustrati",
      "Creare collane tematiche",
      "Gestire la pagina profilo autore",
      "Inviare newsletter alla tua lista lettori",
      "Ricevere donazioni dirette",
      "Esportare le opere in PDF per la stampa",
      "Aprire un Libro Aperto a capitoli progressivi",
    ],
    nonPuoi: [],
    cta: { label: "Diventa autore →", to: "/auth" },
    tone: "border-magenta/40",
    iconTone: "text-magenta/80",
  },
];

function GuidaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// MODULE/GUIDA"
        title="Come funziona"
        subtitle="Scegli come vuoi entrare. Puoi cambiare idea in qualsiasi momento."
      >
        {/* Sezione accesso */}
        <div className="mb-4">
          <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-2">01 — accesso</div>
          <h2 className="font-display text-2xl text-bone mb-8">Chi sei sulla piattaforma?</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {ACCESSI.map((a) => (
            <div
              key={a.label}
              className={`glass hud-frame flex flex-col border ${a.tone} p-6 relative`}
            >
              {/* Angolini HUD */}
              <span className="absolute top-1.5 left-1.5 w-2 h-2 border-l border-t border-current opacity-40" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 border-r border-t border-current opacity-40" />
              <span className="absolute bottom-1.5 left-1.5 w-2 h-2 border-l border-b border-current opacity-40" />
              <span className="absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b border-current opacity-40" />

              {/* Header */}
              <div className="font-mono text-[8px] tracking-[0.3em] text-bone/30 uppercase mb-3">{a.code}</div>
              <div className={`font-display text-5xl mb-3 ${a.iconTone}`}>{a.icon}</div>
              <div className="flex items-baseline gap-3 mb-1">
                <h3 className="font-display text-2xl text-bone tracking-tight">{a.label}</h3>
                <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border ${
                  a.badgeTone === "magenta"
                    ? "border-magenta/50 text-magenta/80 bg-magenta/5"
                    : "border-cyan/40 text-cyan/70 bg-cyan/5"
                }`}>
                  {a.badge}
                </span>
              </div>
              <p className="font-serif italic text-bone/50 text-sm mb-5">{a.tagline}</p>

              <div className="hud-divider mb-5" />

              {/* Descrizione */}
              <p className="font-serif text-bone/70 text-sm leading-relaxed mb-6">
                {a.description}
              </p>

              {/* Puoi */}
              <div className="mb-4 flex-1">
                <div className="font-mono text-[8px] tracking-widest text-cyan/50 uppercase mb-2">✓ Cosa puoi fare</div>
                <ul className="space-y-1">
                  {a.puoi.map((v) => (
                    <li key={v} className="font-serif text-[12px] text-bone/65 flex gap-2">
                      <span className="text-cyan/50 flex-shrink-0 mt-0.5">▸</span>
                      {v}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Non puoi */}
              {a.nonPuoi.length > 0 && (
                <div className="mb-6">
                  <div className="font-mono text-[8px] tracking-widest text-bone/30 uppercase mb-2">✗ Limitazioni</div>
                  <ul className="space-y-1">
                    {a.nonPuoi.map((v) => (
                      <li key={v} className="font-serif text-[12px] text-bone/35 flex gap-2">
                        <span className="text-bone/25 flex-shrink-0 mt-0.5">—</span>
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <Link
                to={a.cta.to}
                className={`mt-auto font-mono text-[10px] uppercase tracking-widest px-4 py-3 border text-center transition-all ${
                  a.badgeTone === "magenta"
                    ? "border-magenta/50 text-magenta hover:bg-magenta/10"
                    : "border-cyan/40 text-cyan hover:bg-cyan/10"
                }`}
              >
                {a.cta.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Nota finale */}
        <div className="glass border border-cyan/10 p-6 text-center">
          <p className="font-serif italic text-bone/50 text-sm leading-relaxed max-w-2xl mx-auto">
            Puoi iniziare come Esploratore e registrarti in qualsiasi momento senza perdere nulla.
            Se sei già registrato come Lettore e vuoi pubblicare, l'abbonamento Autore si attiva dalla tua area riservata.
          </p>
          <div className="mt-4 flex justify-center gap-4 flex-wrap">
            <Link to="/catalogo" className="font-mono text-[10px] uppercase tracking-widest text-cyan/60 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all">
              ▸ Vai al catalogo
            </Link>
            <Link to="/regolamento" className="font-mono text-[10px] uppercase tracking-widest text-bone/40 hover:text-bone border-b border-bone/10 hover:border-bone/40 pb-0.5 transition-all">
              ▸ Leggi il regolamento
            </Link>
          </div>
        </div>

      </PageShell>
      <SiteFooter />
    </div>
  );
}
