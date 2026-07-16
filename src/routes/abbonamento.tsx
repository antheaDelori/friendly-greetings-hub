import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/abbonamento")({
  head: () => ({
    meta: [
      { title: "Abbonamento autori — Liberiamo la mente" },
      { name: "description", content: "Perché chiediamo un abbonamento annuo agli autori e come viene utilizzato." },
    ],
  }),
  component: Abbonamento,
});

function Abbonamento() {
  return (
    <div className="min-h-screen flex flex-col paper-texture">
      <SiteHeader />

      <main className="mx-auto max-w-2xl w-full px-6 py-16 flex-1">

        <div className="mb-10">
          <div className="font-mono text-[10px] tracking-[0.3em] text-blood/70 uppercase mb-3">// abbonamento autori</div>
          <h1 className="font-display text-4xl text-ink leading-tight">Perché €12 all'anno</h1>
          <p className="mt-4 font-serif italic text-ink/60 text-lg leading-relaxed">
            Leggere è un diritto ed è gratuito. Pubblicare ha un costo e vogliamo spiegarti il perché.
          </p>
        </div>

        <div className="border-t border-ink/10 pt-8 space-y-10">

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">— Prima opera gratuita</h2>
            <p className="font-serif text-ink/75 leading-relaxed">
              Ogni autore può pubblicare la sua prima opera senza pagare nulla. Vogliamo che tu possa vedere con i tuoi occhi come funziona la piattaforma, come appare il tuo libro, come reagiscono i lettori. Solo dopo — se vuoi continuare — entra in gioco l'abbonamento.
            </p>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">— Cosa ottieni</h2>
            <ul className="space-y-2">
              {[
                "Download in PDF, ePub e MOBI per i tuoi lettori",
                "Generazione copertina con AI",
                "Area autore con statistiche di lettura",
              ].map(v => (
                <li key={v} className="flex items-start gap-2 font-serif text-sm text-ink/70">
                  <span className="text-blood mt-0.5 shrink-0">◆</span>{v}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">— Dove vanno i soldi</h2>
            <p className="font-serif text-ink/75 leading-relaxed mb-4">
              Liberiamo la mente non ha investitori, non ha pubblicità, non vende i tuoi dati. I costi vengono da tre posti:
            </p>
            <ul className="space-y-3">
              {[
                { label: "Server e database", desc: "Ogni opera pubblicata occupa spazio: testo, copertina, file PDF e ePub. Il database che tiene traccia di lettori, recensioni e segnalibri gira su infrastruttura professionale che costa ogni mese, indipendentemente dal traffico." },
                { label: "Generazione copertina con AI", desc: "Offriamo la possibilità di generare una copertina professionale tramite intelligenza artificiale. Ogni generazione ha un costo reale: paghiamo i modelli di immagine per ogni copertina creata." },
                { label: "Email e notifiche", desc: "Quando un lettore ti segue, quando qualcuno recensisce la tua opera, quando mandi una newsletter ai tuoi lettori — ogni messaggio ha un costo di infrastruttura." },
                { label: "Conversione formati", desc: "Trasformare il tuo testo in PDF, ePub e MOBI compatibili con tutti i dispositivi richiede servizi specializzati che addebitiamo a consumo." },
              ].map(item => (
                <li key={item.label} className="border-l-2 border-blood/30 pl-4">
                  <div className="font-display tracking-wider text-[11px] text-ink/80 uppercase mb-1">{item.label}</div>
                  <p className="font-serif text-sm text-ink/60 leading-relaxed">{item.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">— Un caffè all'anno</h2>
            <p className="font-serif text-ink/75 leading-relaxed">
              €12 all'anno. Un euro al mese. Meno del costo di un caffè. Non è un prezzo per fare profitto — è il minimo per tenere la piattaforma in piedi e indipendente. I lettori non pagano nulla: l'accesso al catalogo è e resterà gratuito. Sei tu, come autore, che con il tuo contributo permetti a tutto questo di esistere.
            </p>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">— Vantaggi ulteriori</h2>
            <ul className="space-y-2">
              {[
                "Pubblicazioni illimitate",
                "Donazioni dirette dai lettori senza intermediari",
                "Newsletter diretta ai tuoi lettori",
              ].map(v => (
                <li key={v} className="flex items-start gap-2 font-serif text-sm text-ink/70">
                  <span className="text-blood mt-0.5 shrink-0">◆</span>{v}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">— Video promozionale AI</h2>
            <p className="font-serif text-ink/75 leading-relaxed mb-4">
              Un breve videoclip cinematografico di 10 secondi, generato dall'intelligenza artificiale a partire dalla descrizione della tua opera — qualcosa che nessun'altra piattaforma di self-publishing offre. Il risultato non è modificabile né rigenerabile gratuitamente: ogni generazione consuma un credito.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-ink/15 p-5">
                <div className="font-display text-2xl text-ink mb-1">€12<span className="text-sm text-ink/50">/anno</span></div>
                <p className="font-serif text-sm text-ink/60 leading-relaxed">Solo abbonamento autore, come sopra.</p>
              </div>
              <div className="border border-blood/40 bg-blood/5 p-5">
                <div className="font-display text-2xl text-ink mb-1">€24<span className="text-sm text-ink/50">/anno</span></div>
                <p className="font-serif text-sm text-ink/60 leading-relaxed">Abbonamento autore + 2 crediti video promozionale.</p>
              </div>
            </div>
            <p className="font-serif italic text-ink/50 text-sm leading-relaxed mt-4">
              Dopo aver inviato il contributo tramite PayPal, scrivici (via il form contatti o rispondendo alla mail di conferma) indicando quale pacchetto hai scelto: attiviamo l'abbonamento e i crediti manualmente, di solito entro un giorno.
            </p>
            <a
              href="https://paypal.me/antheaDelori"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 border border-blood/40 px-5 py-2.5 font-mono tracking-[0.2em] text-xs uppercase text-blood hover:bg-blood/10 transition-all"
            >
              ▸ Vai a PayPal
            </a>
          </section>

        </div>

        <div className="mt-12 border-t border-ink/10 pt-8 flex flex-wrap gap-4">
          <Link
            to="/auth/registrazione"
            search={{ autore: true }}
            className="inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-6 py-3 font-mono tracking-[0.2em] text-xs uppercase text-cyan hover:bg-cyan hover:text-void transition-all"
          >
            ▸ Registrati come autore
          </Link>
          <Link
            to="/auth/"
            className="inline-flex items-center gap-2 border border-ink/20 px-6 py-3 font-mono tracking-[0.2em] text-xs uppercase text-ink/50 hover:border-ink/50 hover:text-ink/80 transition-all"
          >
            ← Torna all'accesso
          </Link>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
