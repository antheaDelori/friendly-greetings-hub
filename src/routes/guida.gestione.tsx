import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/guida/gestione")({
  head: () => ({
    meta: [
      { title: "Guida gestione opere — Liberiamo la mente" },
      { name: "description", content: "Guida di riferimento campo per campo: metadati, capitoli, copertina, PDF, stampa, lettori, donazioni." },
    ],
  }),
  component: GuidaGestionePage,
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

function SectionBlock({ n, title, subtitle, fields }: { n: string; title: string; subtitle: string; fields: Field[] }) {
  return (
    <div className="glass border border-magenta/15 mb-6">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-magenta/15 bg-magenta/[0.03]">
        <span className="font-mono text-[11px] w-7 h-7 border border-magenta/40 text-magenta flex items-center justify-center flex-shrink-0">{n}</span>
        <div>
          <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-magenta">{title}</div>
          <div className="font-mono text-[9px] tracking-widest text-bone/40 mt-0.5">{subtitle}</div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {fields.map(f => <FieldRow key={f.name} {...f} />)}
      </div>
    </div>
  );
}

function GroupBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.3em] text-cyan uppercase">{label}</span>
        <div className="flex-1 border-t border-cyan/15" />
      </div>
      <div className="glass border border-cyan/15">
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

const METADATI_FIELDS: Field[] = [
  { name: "Titolo ★", desc: "Il nome della tua opera. Obbligatorio: senza titolo non puoi salvare." },
  { name: "Sottotitolo", desc: "Opzionale — un secondo titolo più descrittivo, se ti serve." },
  { name: "Genere ★", desc: "Libro, racconto, saggio, articolo, novella, poesia, fumetto o illustrato. Determina quali sezioni successive vedrai (fumetto e illustrato, ad esempio, saltano capitoli-testo e usano invece pagine immagine)." },
  { name: "Tipo / Sottogenere", desc: "Scegli dalla lista predefinita (es. Fantasy, Giallo, Saggistica…) oppure seleziona \"altro\" per scrivere un sottogenere tuo, libero." },
  { name: "Target / Fascia di pubblico", desc: "A chi è rivolta l'opera (es. adulti, young adult, bambini)." },
  { name: "Edizione", desc: "Es. \"Prima edizione\". Opzionale, utile se pubblichi ristampe o versioni riviste." },
  { name: "Anno / Data pubblicazione", desc: "Anno per la maggior parte dei generi; per gli articoli invece compare un campo data completa (giorno/mese/anno)." },
  { name: "Lingua", desc: "Codice lingua, es. \"it\". Serve per l'indicizzazione." },
  { name: "ISBN", desc: "Se lo possiedi già. Puoi lasciarlo vuoto e inserirlo più avanti (compare anche nella sezione 05, copertina da stampa)." },
  { name: "Formato tavole", desc: "Solo per il genere Fumetto: A4 verticale, A4 orizzontale o Manga — determina le proporzioni delle pagine che caricherai in sezione 02." },
  {
    name: "Accesso",
    desc: "Gratuito (chiunque legge liberamente) o Riservato (solo chi è nella lista email autorizzati può leggerla). Con Riservato compare il pannello \"Chi può leggere questo libro\": aggiungi email una a una, oppure importa l'intera lista da un'altra tua opera già riservata.",
  },
  {
    name: "Libro Aperto",
    desc: "Attiva questo interruttore se vuoi pubblicare l'opera capitolo per capitolo mentre la scrivi, invece che tutta insieme. I capitoli si aggiungono dall'Area Autore dopo il primo salvataggio, e ogni lettore che ti segue riceve un'email a ogni nuova uscita.",
  },
  {
    name: "Descrizione / Sinossi",
    desc: "Il testo di presentazione che i lettori vedono nel catalogo e nella pagina del libro.",
  },
  {
    name: "Estratto ★ — anteprima pubblica",
    desc: "Fondamentale se condividi link diretti (messaggi, social, QR code): chi clicca il link vede prima questo estratto, poi decide se registrarsi. Senza estratto trova solo un invito al login e spesso abbandona.",
    note: "Scrivi almeno 3-5 righe — le prime pagine del libro, o un brano che ti rappresenta.",
  },
  {
    name: "Testo completo",
    desc: "Compare solo se l'opera è assegnata a una collana (novella): un editor ricco dove scrivi il testo integrale della novella, invece di usare i capitoli della sezione 02.",
  },
  { name: "Tag", desc: "Parole chiave separate da virgola (es. \"fantascienza, distopia, futuro\") — aiutano la ricerca nel catalogo." },
  { name: "Collana", desc: "Se hai già creato una collana, puoi assegnarci questa opera. Compare solo se possiedi almeno una collana." },
];

const CAPITOLI_FIELDS: Field[] = [
  { name: "Ordine", desc: "Numero progressivo del capitolo — determina la sequenza di lettura." },
  { name: "Titolo del capitolo", desc: "Es. \"Capitolo I — L'inizio\"." },
  {
    name: "Testo",
    desc: "Editor di testo ricco (grassetto, corsivo, immagini…). Puoi anche importare un file già scritto — .docx, .txt o .pdf — invece di scrivere da zero: il testo viene versato automaticamente nell'editor.",
    note: "Da Pages su Mac: File → Esporta in → Word (.docx). Da un PDF le immagini non si importano, vanno aggiunte a mano con ⊞ nella toolbar.",
  },
  { name: "Materiali extra — Titolo", desc: "Nome del materiale allegato (es. \"Albero genealogico\", \"Mappa del mondo\")." },
  { name: "Materiali extra — Descrizione", desc: "Opzionale: due righe su cosa mostra l'allegato o come leggerlo." },
  { name: "Materiali extra — File", desc: "Un'immagine o un PDF a corredo del capitolo/dell'opera (mappe, illustrazioni, appendici)." },
];

const FUMETTO_FIELDS: Field[] = [
  { name: "Tavole (Fumetto)", desc: "Carica le pagine in ordine — JPG, PNG o WEBP. Compaiono al lettore esattamente nell'ordine di caricamento." },
];

const ILLUSTRATO_FIELDS: Field[] = [
  { name: "Immagini (Illustrato)", desc: "Carica le immagini in ordine, poi scrivi il testo di ogni pagina nel campo accanto — si salva da solo quando esci dal campo." },
  { name: "Genera PDF", desc: "Una volta caricate le pagine, genera da qui il PDF dell'opera (pagina bianca iniziale, poi testo e immagine alternati)." },
];

const COPERTINA_FIELDS: Field[] = [
  { name: "Carica copertina", desc: "JPG o PNG, ridimensionata automaticamente, max 800KB." },
  {
    name: "Genera con AI — descrizione",
    desc: "Descrivi a parole la scena che immagini per la copertina (più è dettagliata, più il risultato si avvicina a quello che hai in mente). Titolo, autore e logo vengono aggiunti automaticamente sopra l'immagine generata.",
    note: "10 generazioni gratuite per opera. Esaurite quelle, puoi richiedere un pacchetto aggiuntivo scrivendo un messaggio dal form che compare.",
  },
];

const PDF_FIELDS: Field[] = [
  {
    name: "Manoscritto .docx",
    desc: "Carica il file Word completo dell'opera: da qui vengono generati automaticamente PDF, E-Book (.epub, compatibile Kindle 2022+/Kobo/Apple Books) e Kindle classico (.mobi, per dispositivi fino al 2021).",
    note: "10 conversioni gratuite. Il numero di pagine del PDF generato qui è quello che la sezione 05 userà per calcolare la larghezza della spina.",
  },
];

const STAMPA_FIELDS: Field[] = [
  { name: "Formato", desc: "A5, 15×21cm, 17×24cm o Tascabile (105×148mm) — la dimensione fisica del libro stampato." },
  { name: "Numero di pagine", desc: "Calcolato automaticamente dal PDF generato in sezione 04 — non è modificabile a mano finché non generi prima quel PDF." },
  { name: "Aletta anteriore", desc: "Si piega dentro la copertina davanti. Testo libero (bio, nota sull'opera) oppure un'immagine tua che sostituisce tutto." },
  { name: "Quarta di copertina (retro)", desc: "Il retro del libro. Testo automatico (descrizione + prezzo + ISBN) oppure un'immagine tua che sostituisce l'intera area." },
  { name: "Spina", desc: "Il dorso centrale, largo in proporzione al numero di pagine. Automatica (titolo, autore e logo ruotati) oppure un'immagine tua." },
  { name: "Aletta posteriore", desc: "Si piega dentro il retro. Testo libero (collana, altri titoli, note) oppure un'immagine tua." },
  { name: "Foto autore", desc: "Opzionale, compare in cima all'aletta posteriore solo se quella sezione è in modalità testo." },
  { name: "ISBN / logo", desc: "Se inserisci un ISBN compare in basso a destra del retro; altrimenti al suo posto compare il logo Liberiamo come segnaposto." },
  { name: "Prezzo", desc: "Valuta (EUR, USD, GBP, CHF, JPY) + importo — stampato in basso a sinistra del retro. Opzionale." },
];

const COLLANA_FIELDS: Field[] = [
  { name: "Titolo collana ★", desc: "Es. \"Le novelle di primavera\"." },
  { name: "Descrizione", desc: "Di cosa parla la collana nel suo insieme." },
  { name: "Copertina collana", desc: "Un'immagine che rappresenta la collana, mostrata nella pagina dedicata." },
];

function GuidaGestionePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// GUIDA/GESTIONE"
        title="Gestire le tue opere"
        subtitle="Guida di riferimento campo per campo: cosa inserire, dove, e perché."
      >
        <div className="mb-8">
          <Link
            to="/gestione"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna alla gestione
          </Link>
        </div>

        {/* Le tue opere */}
        <GroupBlock label="// le tue opere">
          <FieldRow name="+ NUOVA OPERA" desc="Apre il form a sezioni numerate (quello descritto sotto). Compila almeno titolo e genere in sezione 01, poi salva: le altre sezioni si sbloccano." />
          <FieldRow name="Filtri per genere" desc="I pulsanti sopra l'elenco (Libro, Racconto, Saggio, Articolo, Novelle, Poesia, Fumetto, Illustrato) filtrano la lista delle tue opere per tipo." />
          <FieldRow name="Selezionare un'opera" desc="Clicca un titolo dall'elenco per riaprirlo nello stesso form, in qualunque sezione tu voglia." />
          <FieldRow name="Generi e limiti" desc="In fase beta: 1 opera gratuita (libro/racconto/saggio…) più 5 articoli e 5 poesie. Per sbloccare fino a 5 opere scrivi a info@liberiamo2076.com con nome e titolo, o lascia una donazione libera dal pannello che appare al raggiungimento del limite." />
        </GroupBlock>

        {/* Sezioni numerate del form opera */}
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.3em] text-magenta uppercase">// dentro un'opera — le 5 sezioni</span>
          <div className="flex-1 border-t border-magenta/15" />
        </div>

        <SectionBlock n="01" title="Metadati" subtitle="titolo · genere · sinossi · collana" fields={METADATI_FIELDS} />
        <SectionBlock n="02" title="Capitoli" subtitle="testi, materiali extra (per libri, racconti, saggi, articoli, poesie, novelle)" fields={CAPITOLI_FIELDS} />
        <SectionBlock n="02" title="Pagine — Fumetto" subtitle="solo se il genere è Fumetto" fields={FUMETTO_FIELDS} />
        <SectionBlock n="02" title="Pagine — Illustrato" subtitle="solo se il genere è Illustrato" fields={ILLUSTRATO_FIELDS} />
        <SectionBlock n="03" title="Copertina" subtitle="carica o genera con AI" fields={COPERTINA_FIELDS} />
        <SectionBlock n="04" title="Genera PDF ed E-Book" subtitle="dal manoscritto .docx" fields={PDF_FIELDS} />
        <SectionBlock n="05" title="Copertina da stampa" subtitle="fronte, spina, retro, alette — testo o immagine" fields={STAMPA_FIELDS} />

        {/* Collane */}
        <GroupBlock label="// collane">
          <p className="font-serif italic text-bone/50 text-sm">
            Una collana raggruppa più opere (novelle) da leggere in un ordine preciso. Si crea e modifica separatamente dalle opere singole, dal pulsante CREA/MODIFICA collana.
          </p>
          {COLLANA_FIELDS.map(f => <FieldRow key={f.name} {...f} />)}
        </GroupBlock>

        {/* Oltre le opere */}
        <GroupBlock label="// oltre le opere">
          <p className="font-serif italic text-bone/50 text-sm">
            Più in basso nella stessa pagina, sotto l'elenco di opere e collane, trovi tre strumenti che riguardano il tuo canale nel suo complesso, non una singola opera.
          </p>
          <FieldRow name="I tuoi lettori — aggiungi indirizzo" desc="Aggiungi manualmente le email di chi vuoi avvisare delle tue pubblicazioni." />
          <FieldRow
            name="I tuoi lettori — Invia comunicazione"
            desc="Scegli l'opera da presentare e scrivi un messaggio personale opzionale, poi invia: parte un'email curata a tutti i tuoi lettori in copia nascosta (non si vedono tra loro). Tu ricevi sempre una copia."
          />
          <FieldRow name="PayPal donazioni" desc="Inserisci il tuo link paypal.me personale: comparirà sulla pagina donazioni della piattaforma così i lettori possono sostenerti direttamente." />
          <FieldRow name="Moderazione community" desc="Le recensioni segnalate dai lettori sulle tue opere compaiono qui: puoi bloccarle o ripristinarle. Se non c'è nulla di segnalato, resta vuota." />
        </GroupBlock>

        {/* Cestino e archiviazione */}
        <GroupBlock label="// cestino e archiviazione">
          <FieldRow name="Cestino degli Scritti Perduti" desc="Invece di eliminare un'opera puoi spostarla nel Cestino: resta visibile al pubblico, i lettori possono leggerla e votare per farla tornare in catalogo. La ripristini tu quando vuoi." />
          <FieldRow name="Archivia" desc="Nasconde l'opera dal catalogo pubblico ma resta recuperabile in ogni momento dalla tua area gestione." />
          <FieldRow name="Elimina definitivamente" desc="Cancella l'opera senza possibilità di recupero." note="Usalo con attenzione — non è reversibile." />
        </GroupBlock>

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
