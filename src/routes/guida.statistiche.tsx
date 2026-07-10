import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida/statistiche")({
  head: () => ({
    meta: [
      { title: "Guida statistiche — Liberiamo la mente" },
      { name: "description", content: "Guida di riferimento: cosa significa ogni numero e ogni grafico nella pagina statistiche." },
    ],
  }),
  component: GuidaStatistichePage,
});

type Field = { name: string; desc: string; note?: string };

function FieldRow({ name, desc, note }: Field) {
  return (
    <div className="border-b border-cyan/10 pb-3">
      <div className="font-mono text-[10px] tracking-widest text-cyan uppercase">
        ↳ {name}
      </div>
      <p className="font-serif text-sm text-bone/65 leading-relaxed mt-1">{desc}</p>
      {note && <p className="font-mono text-[9px] text-magenta/70 tracking-wide mt-1">⚑ {note}</p>}
    </div>
  );
}

function GroupBlock({ label, intro, children }: { label: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.3em] text-cyan uppercase">{label}</span>
        <div className="flex-1 border-t border-cyan/15" />
      </div>
      <div className="glass border border-cyan/15">
        <div className="p-5 space-y-4">
          {intro && <p className="font-serif italic text-bone/50 text-sm">{intro}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

const RIEPILOGO_FIELDS: Field[] = [
  { name: "Letture", desc: "Numero totale di aperture online di tutte le tue opere, sommate insieme. Conta ogni volta che qualcuno apre un'opera per leggerla sul sito — non i download." },
  { name: "Download", desc: "Quante volte i lettori hanno scaricato il PDF o l'e-book delle tue opere, in totale." },
  { name: "Recensioni", desc: "Numero di recensioni pubblicate (non bloccate dalla moderazione) su tutte le tue opere insieme." },
  { name: "Rating medio", desc: "La media delle stelle di tutte le recensioni ricevute, calcolata su tutte le opere insieme." },
  { name: "Like", desc: "Numero totale di ♥ ricevuti dalle tue opere." },
  { name: "Follower", desc: "Solo per i Libri Aperti: lettori iscritti per ricevere un'email a ogni nuovo capitolo pubblicato." },
];

const DASHBOARD_FIELDS: Field[] = [
  { name: "Letture per opera", desc: "Grafico a barre: le tue 8 opere più lette, in ordine." },
  { name: "Distribuzione generi", desc: "Grafico a torta: quante opere hai pubblicato per ciascun genere." },
  { name: "Download per opera", desc: "Grafico a barre: le tue 8 opere più scaricate." },
  { name: "Like e Follower per opera", desc: "Confronto tra ♥ ricevuti e follower, per le tue 6 opere più lette." },
  { name: "Engagement per opera", desc: "Per le tue 6 opere più lette: like, salvataggi in libreria e recensioni affiancati, per vedere a colpo d'occhio quale genera più interazione." },
  { name: "Distribuzione recensioni", desc: "Quante recensioni hai ricevuto per ciascun voto, da 1 a 5 stelle." },
];

const OPERA_FIELDS: Field[] = [
  { name: "Filtro per genere", desc: "Se pubblichi in più generi, compaiono dei pulsanti in alto per mostrare solo le opere di un genere alla volta. Con un solo genere il filtro non compare." },
  { name: "Stelle", desc: "Media dei voti ricevuti da quell'opera — visibile solo se ha almeno una recensione." },
  { name: "Letture / Download / Recensioni / Like", desc: "Gli stessi indicatori del riepilogo globale, ma calcolati sulla singola opera." },
  { name: "Libreria", desc: "Quanti lettori hanno salvato quest'opera nella propria libreria personale." },
  {
    name: "Follower — oppure — Capitoli",
    desc: "Se l'opera è un Libro Aperto ancora \"in scrittura\" vedi i Follower iscritti agli aggiornamenti; se invece è un'opera completa, al suo posto vedi il numero di capitoli pubblicati.",
  },
];

const RECENSIONI_FIELDS: Field[] = [
  {
    name: "Cosa dicono i lettori",
    desc: "Le ultime recensioni con un testo scritto (non solo un voto) ricevute su tutte le tue opere: stelle, nome del lettore, titolo dell'opera, data e il testo della recensione.",
  },
  {
    name: "Rispondi alle recensioni",
    desc: "Il link in fondo al pannello ti riporta nell'area riservata, dove puoi rispondere pubblicamente a ciascuna recensione.",
  },
];

function GuidaStatistichePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// GUIDA/STATISTICHE"
        title="Leggere le tue statistiche"
        subtitle="Cosa significa ogni numero e ogni grafico nella pagina statistiche."
      >
        <div className="mb-8">
          <Link
            to="/statistiche"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna alle statistiche
          </Link>
        </div>

        <GroupBlock
          label="// riepilogo globale"
          intro="I numeri in alto: sono la somma di tutte le tue opere pubblicate, aggiornati in tempo reale."
        >
          {RIEPILOGO_FIELDS.map(f => <FieldRow key={f.name} {...f} />)}
        </GroupBlock>

        <GroupBlock
          label="// dashboard visiva"
          intro="Sei grafici, nascosti dietro il pulsante ▲/▼ apri: compaiono solo se hai almeno un'opera pubblicata."
        >
          {DASHBOARD_FIELDS.map(f => <FieldRow key={f.name} {...f} />)}
        </GroupBlock>

        <GroupBlock
          label="// dettaglio per opera"
          intro="Più in basso trovi l'elenco di tutte le tue opere, una per una, ciascuna con le sue metriche."
        >
          {OPERA_FIELDS.map(f => <FieldRow key={f.name} {...f} />)}
        </GroupBlock>

        <GroupBlock label="// ultime recensioni">
          {RECENSIONI_FIELDS.map(f => <FieldRow key={f.name} {...f} />)}
        </GroupBlock>

        <div className="glass border border-cyan/10 p-6 text-center">
          <p className="font-serif italic text-bone/50 text-sm leading-relaxed max-w-2xl mx-auto">
            Non trovi quello che cerchi? Scrivi a{" "}
            <a href="mailto:info@liberiamo2076.com" className="text-cyan hover:underline">info@liberiamo2076.com</a>.
          </p>
          <div className="mt-4 flex justify-center">
            <Link to="/statistiche" className="font-mono text-[10px] uppercase tracking-widest text-magenta/70 hover:text-magenta border-b border-magenta/20 hover:border-magenta pb-0.5 transition-all">
              ▸ Torna alle statistiche
            </Link>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
