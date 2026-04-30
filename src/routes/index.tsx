import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { books } from "@/data/books";
import logo from "@/assets/logo-liberiamo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liberiamo la mente — Read or Perish" },
      { name: "description", content: "La piattaforma indipendente per leggere libri, racconti, saggi e articoli direttamente dagli autori. Iscriviti, leggi, commenta, sostieni." },
    ],
  }),
  component: Index,
});

function Index() {
  const featured = books.slice(0, 4);
  const fresh = books.slice(4, 8);
  const totals = {
    opere: books.length * 14,
    autori: 132,
    letture: books.reduce((s, b) => s + b.reads, 0),
  };

  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="relative ink-texture text-paper overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0 31px, rgba(255,255,255,.6) 31px 32px)" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20 md:py-28 grid lg:grid-cols-12 gap-10 items-center relative">
          <div className="lg:col-span-7 fade-up">
            <div className="inline-flex items-center gap-2 border border-paper/30 px-3 py-1 font-display tracking-[0.25em] text-[10px] text-gold">
              <span className="h-1.5 w-1.5 bg-blood rounded-full animate-pulse" />
              il mondo dei creativi
            </div>
            <h1 className="mt-6 font-display text-[clamp(3.5rem,9vw,8rem)] leading-[0.9] tracking-tight">
              READ
              <br />
              <span className="text-blood">OR</span> PERISH.
            </h1>
            <p className="mt-8 font-serif text-xl md:text-2xl text-paper/80 max-w-xl leading-relaxed">
              Libri, racconti, saggi e articoli pubblicati direttamente dagli autori.
              Una piattaforma per <em className="text-gold not-italic">liberare la mente</em> — la tua, e la loro.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-3 bg-blood px-7 py-4 font-display tracking-widest text-sm uppercase text-paper hover:bg-paper hover:text-ink transition-colors"
              >
                Esplora il catalogo →
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-3 border border-paper/40 px-7 py-4 font-display tracking-widest text-sm uppercase text-paper hover:border-gold hover:text-gold transition-colors"
              >
                Diventa autore
              </button>
            </div>

            <dl className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { k: "opere", v: totals.opere, label: "opere pubblicate" },
                { k: "autori", v: totals.autori, label: "autori indipendenti" },
                { k: "letture", v: totals.letture, label: "letture totali" },
              ].map((s) => (
                <div key={s.k} className="border-l-2 border-blood pl-4">
                  <dt className="font-display text-3xl md:text-4xl text-paper">
                    {s.v.toLocaleString("it-IT")}
                  </dt>
                  <dd className="font-sans text-[11px] uppercase tracking-widest text-paper/60 mt-1">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-5 relative fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative mx-auto w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-blood rotate-3" />
              <div className="absolute inset-0 bg-gold -rotate-2 translate-x-3 translate-y-3" />
              <img
                src={logo}
                alt="Logo Liberiamo la mente"
                className="relative h-full w-full object-cover ring-4 ring-paper"
              />
              <div className="absolute -bottom-6 -right-6 bg-paper text-ink px-5 py-3 stamp-border">
                <div className="font-display tracking-[0.2em] text-xs">EST. 2026</div>
                <div className="font-serif italic text-sm">indipendente · libero</div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="border-y border-paper/15 bg-ink/40 overflow-hidden">
          <div className="marquee flex gap-12 py-4 whitespace-nowrap font-display tracking-[0.3em] text-sm text-paper/70">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-12 shrink-0">
                <span>· LEGGI ONLINE</span>
                <span className="text-blood">· READ OR PERISH</span>
                <span>· SCARICA IN PDF</span>
                <span className="text-gold">· COMMENTA L'AUTORE</span>
                <span>· SOSTIENI CON UNA DONAZIONE</span>
                <span className="text-blood">· LIBERIAMO LA MENTE</span>
                <span>· LIBRI · RACCONTI · SAGGI · ARTICOLI</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IN EVIDENZA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="font-display tracking-[0.25em] text-xs text-blood">— in evidenza</div>
            <h2 className="mt-3 font-display text-5xl md:text-6xl text-ink">Le opere che mordono</h2>
            <p className="mt-3 font-serif text-lg text-ink/70 max-w-xl">
              Selezionate dalla redazione e dai lettori. Carta e inchiostro digitali, ma con denti.
            </p>
          </div>
          <Link
            to="/catalogo"
            className="font-display tracking-widest text-xs uppercase text-ink border-b-2 border-blood pb-1 hover:text-blood transition-colors self-start md:self-auto"
          >
            Vedi tutto il catalogo →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featured.map((b) => <BookCard key={b.slug} book={b} />)}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="bg-ink text-paper py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none text-stroke-paper font-display text-[20rem] leading-none flex items-center justify-center select-none">
          MANIFESTO
        </div>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 relative">
          <div className="font-display tracking-[0.25em] text-xs text-gold">— manifesto</div>
          <h2 className="mt-3 font-display text-5xl md:text-7xl leading-none">
            Tre regole.<br /><span className="text-blood">Niente di più.</span>
          </h2>
          <ol className="mt-12 space-y-10">
            {[
              { n: "01", t: "I diritti restano agli autori.", d: "Chi scrive decide cosa pubblicare, cosa rendere scaricabile, cosa lasciare protetto. Sempre." },
              { n: "02", t: "I lettori contano.", d: "Recensioni, commenti capitolo per capitolo, possibilità di seguire chi ti emoziona. La community è la spina dorsale." },
              { n: "03", t: "Niente algoritmi che urlano.", d: "Filtri trasparenti: più letti, più recenti, per genere. Tu scegli cosa leggere — non un'IA per te." },
            ].map((r) => (
              <li key={r.n} className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 items-baseline border-b border-paper/15 pb-8">
                <div className="font-display text-5xl md:text-6xl text-blood">{r.n}</div>
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl">{r.t}</h3>
                  <p className="mt-3 font-sans text-paper/70 text-base md:text-lg max-w-2xl leading-relaxed">{r.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* APPENA USCITI */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="font-display tracking-[0.25em] text-xs text-blood">— ultime pubblicazioni</div>
            <h2 className="mt-3 font-display text-5xl md:text-6xl text-ink">Appena usciti</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {fresh.map((b) => <BookCard key={b.slug} book={b} />)}
        </div>
      </section>

      {/* CTA AUTORI */}
      <section id="community" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pb-20">
        <div className="grid lg:grid-cols-2 gap-0 border-2 border-ink">
          <div className="bg-paper p-10 md:p-14">
            <div className="font-display tracking-[0.25em] text-xs text-blood">— per gli autori</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-ink leading-none">
              Hai qualcosa<br />da dire?
            </h2>
            <p className="mt-6 font-serif text-lg text-ink/75 max-w-md">
              Pubblica direttamente: libri, racconti, saggi o articoli. Mantieni i diritti, scegli cosa rendere scaricabile, ricevi donazioni dai lettori che ti seguono.
            </p>
            <button className="mt-8 inline-flex items-center gap-3 bg-ink text-paper px-7 py-4 font-display tracking-widest text-sm uppercase hover:bg-blood transition-colors">
              Crea il tuo profilo autore
            </button>
          </div>
          <div className="bg-blood text-paper p-10 md:p-14 flex flex-col justify-between">
            <div>
              <div className="font-display tracking-[0.25em] text-xs text-gold">— per i lettori</div>
              <h2 className="mt-3 font-display text-4xl md:text-5xl leading-none">
                Vuoi solo<br />leggere?
              </h2>
              <p className="mt-6 font-serif text-lg text-paper/85 max-w-md">
                Accesso gratuito a tutti i contenuti pubblici. Commenta, segui gli autori, scarica nei limiti previsti, sostieni chi ami con una donazione libera.
              </p>
            </div>
            <Link to="/catalogo" className="mt-8 inline-flex items-center gap-3 bg-paper text-ink px-7 py-4 font-display tracking-widest text-sm uppercase hover:bg-ink hover:text-paper transition-colors self-start">
              Inizia a leggere →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
