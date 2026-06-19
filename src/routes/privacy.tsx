import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell } from "@/components/HudPanel";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Liberiamo la mente" },
      { name: "description", content: "Informativa sul trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679)." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// MODULE/PRIVACY.txt"
        title="Privacy Policy"
        subtitle="Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR)."
      >
        <div className="space-y-6 max-w-3xl mx-auto">

          <HudPanel label="art. 01 — titolare del trattamento" code="§§ 01" tone="cyan">
            <p className="font-serif text-bone/80 leading-relaxed">
              Titolare del trattamento è <span className="text-cyan">Anthea Delori Edizioni</span>, gestita da Daniele Girtanner.
              Per esercitare i tuoi diritti o per qualsiasi richiesta relativa alla privacy, scrivi a{" "}
              <a href="mailto:info@liberiamo2076.com" className="text-cyan hover:underline">info@liberiamo2076.com</a>.
            </p>
          </HudPanel>

          <HudPanel label="art. 02 — dati raccolti" code="§§ 02" tone="cyan">
            <p className="font-serif text-bone/80 leading-relaxed mb-4">Raccogliamo i seguenti dati personali:</p>
            <ul className="space-y-2 font-serif text-bone/80 leading-relaxed">
              <li>▸ <span className="text-cyan">Dati obbligatori</span>: nome, cognome, indirizzo email, password.</li>
              <li>▸ <span className="text-cyan">Dati facoltativi</span>: pseudonimo, numero di telefono, data di nascita, indirizzo, URL avatar.</li>
              <li>▸ <span className="text-cyan">Dati del profilo autore</span> (solo per chi pubblica opere): biografia, generi letterari, link donazione.</li>
              <li>▸ <span className="text-cyan">Dati di attività</span>: recensioni, commenti, donazioni effettuate sulla piattaforma.</li>
            </ul>
          </HudPanel>

          <HudPanel label="art. 03 — finalità e base giuridica" code="§§ 03" tone="cyan">
            <ul className="space-y-3 font-serif text-bone/80 leading-relaxed">
              <li>▸ <span className="text-cyan">Erogazione del servizio</span> (Art. 6(1)(b) GDPR): registrazione, accesso, pubblicazione opere, download.</li>
              <li>▸ <span className="text-cyan">Notifiche email</span> (Art. 6(1)(b) GDPR): avvisi su recensioni, commenti, nuovi capitoli, donazioni ricevute.</li>
              <li>▸ <span className="text-cyan">Moderazione contenuti</span> (Art. 6(1)(f) GDPR): legittimo interesse a mantenere un ambiente sicuro.</li>
              <li>▸ <span className="text-cyan">Marketing e newsletter</span> (Art. 6(1)(a) GDPR): solo previo consenso esplicito.</li>
            </ul>
          </HudPanel>

          <HudPanel label="art. 04 — conservazione dei dati" code="§§ 04" tone="cyan">
            <ul className="space-y-3 font-serif text-bone/80 leading-relaxed">
              <li>▸ <span className="text-cyan">Dati account</span>: conservati per tutta la durata del rapporto contrattuale e per i successivi <span className="text-cyan">10 anni</span> ai fini fiscali e legali, salvo diverso obbligo normativo.</li>
              <li>▸ <span className="text-cyan">Log di attività</span> (accessi, download, recensioni): conservati per un massimo di <span className="text-cyan">12 mesi</span>.</li>
              <li>▸ <span className="text-cyan">Log di moderazione</span> (segnalazioni, violazioni contestate): conservati per un massimo di <span className="text-cyan">24 mesi</span> ai fini di sicurezza e tutela legale della piattaforma. Hai il diritto di sapere se un tuo contenuto è stato segnalato e di contestare la decisione scrivendo a <a href="mailto:info@liberiamo2076.com" className="text-cyan hover:underline">info@liberiamo2076.com</a>.</li>
            </ul>
          </HudPanel>

          <HudPanel label="art. 05 — condivisione con terze parti" code="§§ 05" tone="cyan">
            <ul className="space-y-2 font-serif text-bone/80 leading-relaxed">
              <li>▸ <span className="text-cyan">Supabase</span> (USA/EU): database, autenticazione e storage. Conforme GDPR tramite Standard Contractual Clauses.</li>
              <li>▸ <span className="text-cyan">Resend</span>: invio email transazionali. I dati trasferiti si limitano a indirizzo email e contenuto del messaggio.</li>
              <li>▸ <span className="text-cyan">OpenAI</span>: generazione copertine AI. Riceve solo il prompt testuale, non dati personali dell'utente.</li>
              <li>▸ <span className="text-cyan">PayPal</span>: gestione donazioni. Il reindirizzamento avviene sul sito PayPal, soggetto alla propria privacy policy.</li>
              <li>▸ <span className="text-cyan">Vercel</span>: hosting dell'applicazione. Conforme GDPR.</li>
            </ul>
            <p className="font-serif text-bone/60 leading-relaxed mt-4 text-sm">
              Nessun dato personale viene venduto o ceduto a terzi per finalità di profilazione commerciale.
            </p>
          </HudPanel>

          <HudPanel label="art. 06 — i tuoi diritti" code="§§ 06" tone="magenta">
            <p className="font-serif text-bone/80 leading-relaxed mb-4">
              Ai sensi degli artt. 15-22 GDPR hai diritto a:
            </p>
            <ul className="space-y-2 font-serif text-bone/80 leading-relaxed">
              <li>▸ <span className="text-cyan">Accesso</span>: ottenere copia dei tuoi dati personali.</li>
              <li>▸ <span className="text-cyan">Rettifica</span>: correggere dati inesatti.</li>
              <li>▸ <span className="text-cyan">Cancellazione</span>: richiedere la rimozione del tuo account e dei tuoi dati.</li>
              <li>▸ <span className="text-cyan">Portabilità</span>: ricevere i tuoi dati in formato strutturato.</li>
              <li>▸ <span className="text-cyan">Opposizione</span>: opporti al trattamento basato su legittimo interesse.</li>
              <li>▸ <span className="text-cyan">Revoca del consenso</span>: in qualsiasi momento, senza pregiudizio per il trattamento precedente.</li>
            </ul>
            <p className="font-serif text-bone/60 leading-relaxed mt-4 text-sm">
              Per esercitare questi diritti scrivi a{" "}
              <a href="mailto:info@liberiamo2076.com" className="text-cyan hover:underline">info@liberiamo2076.com</a>.
              Hai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (
              <span className="text-cyan">garante.privacy.it</span>).
            </p>
          </HudPanel>

          <HudPanel label="art. 07 — cookie" code="§§ 07" tone="cyan">
            <p className="font-serif text-bone/80 leading-relaxed">
              Utilizziamo esclusivamente <span className="text-cyan">cookie tecnici</span> necessari al funzionamento della piattaforma
              (sessione utente, preferenze di navigazione). Non utilizziamo cookie di profilazione o di terze parti a fini pubblicitari.
            </p>
          </HudPanel>

          <HudPanel label="art. 08 — intelligenza artificiale" code="§§ 08" tone="magenta">
            <p className="font-serif text-bone/80 leading-relaxed">
              La piattaforma offre la generazione automatica di copertine tramite sistemi di intelligenza artificiale (OpenAI).
              Ai sensi del <span className="text-cyan">Regolamento UE sull'IA (AI Act)</span>, le immagini generate da AI sono
              chiaramente identificate come tali. Le copertine AI-generated potrebbero non essere tutelabili da copyright in alcune
              giurisdizioni. L'autore è responsabile dell'utilizzo e della pubblicazione di tali immagini.
            </p>
          </HudPanel>

          <div className="font-mono text-[10px] text-bone/30 text-center tracking-widest uppercase pt-4">
            Ultimo aggiornamento: giugno 2026 · Anthea Delori Edizioni
          </div>

        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
