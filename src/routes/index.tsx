import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { books } from "@/data/books";
import logo from "@/assets/liberiamo-hero.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liberiamo la mente — Read or Perish" },
      { name: "description", content: "Biblioteca olografica indipendente. Libri, racconti, saggi e articoli pubblicati direttamente dagli autori. Read or perish." },
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
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden scanlines">
        {/* glow ambient */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-magenta/10 blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20 md:py-32 grid lg:grid-cols-12 gap-10 items-center relative">
          <div className="lg:col-span-7 fade-up">
            <div className="inline-flex items-center gap-3 border border-cyan/40 bg-cyan/5 px-3 py-1.5 font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">
              <span className="h-1.5 w-1.5 bg-cyan rounded-full animate-pulse" />
              SYS // il mondo dei creativi · 2076
            </div>
            <h1 className="mt-6 font-display text-[clamp(3.5rem,9vw,8.5rem)] leading-[0.88] tracking-tight text-bone">
              <span className="block">READ</span>
              <span className="block"><span className="text-magenta text-glow-magenta">OR</span> PERISH<span className="text-cyan text-glow-cyan">.</span></span>
            </h1>
            <p className="mt-3 font-mono text-[10px] tracking-widest text-bone/55 uppercase">
              biblioteca digitale · rete olografica · anno 2076
            </p>
            <p className="mt-6 font-serif text-xl md:text-2xl text-bone/75 max-w-xl leading-relaxed italic">
              Una biblioteca sospesa nel vetro. Libri, racconti, saggi e articoli
              pubblicati direttamente dagli autori, senza algoritmi che urlano.
              Solo <span className="text-cyan not-italic font-mono text-base tracking-widest">parole_vive</span>.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/catalogo"
                className="group relative inline-flex items-center gap-3 border border-cyan/70 bg-cyan/15 px-7 py-4 font-mono tracking-[0.22em] text-xs uppercase text-cyan hover:bg-cyan hover:text-void hover:glow-cyan transition-all hud-frame"
              >
                ▸ Esplora il catalogo
              </Link>
              <Link
                to="/auth/registrazione"
                className="inline-flex items-center gap-3 border border-magenta/60 bg-magenta/10 px-7 py-4 font-mono tracking-[0.22em] text-xs uppercase text-magenta hover:bg-magenta hover:text-void hover:glow-magenta transition-all"
              >
                ◆ Diventa autore
              </Link>
            </div>

            <dl className="mt-16 grid grid-cols-3 gap-4 max-w-2xl">
              {[
                { k: "opere", v: totals.opere, label: "opere indicizzate", c: "text-cyan" },
                { k: "autori", v: totals.autori, label: "autori connessi", c: "text-magenta" },
                { k: "letture", v: totals.letture, label: "letture totali", c: "text-amber" },
              ].map((s) => (
                <div key={s.k} className="glass p-4 hud-frame">
                  <dt className={`font-display text-3xl md:text-4xl ${s.c}`}>
                    {s.v.toLocaleString("it-IT")}
                  </dt>
                  <dd className="font-mono text-[9px] uppercase tracking-widest text-bone/50 mt-2">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* HOLO ARTIFACT */}
          <div className="lg:col-span-5 relative fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative mx-auto w-full max-w-lg scan-sweep">
              {/* glow halo behind artifact */}
              <div className="absolute inset-16 rounded-full bg-cyan/30 blur-3xl pointer-events-none" />
              <div className="absolute inset-20 rounded-full bg-magenta/15 blur-2xl pointer-events-none" />

              {/* rotating rings — sopra all'immagine, decorativi */}
              <div className="absolute inset-0 border border-cyan/25 rotate-45 pointer-events-none" />
              <div className="absolute inset-4 border border-cyan/15 animate-[spin_80s_linear_infinite] pointer-events-none" />
              <div className="absolute inset-10 border border-magenta/20 animate-[spin_50s_linear_infinite_reverse] pointer-events-none" />

              {/* artifact image — proporzioni naturali, nessun ritaglio */}
              <div className="relative hud-frame m-6">
                <img
                  src={logo}
                  alt="Liberiamo la mente — libro di vetro olografico"
                  className="w-full h-auto block drop-shadow-[0_0_40px_oklch(0.82_0.16_200/0.6)]"
                />
              </div>

              {/* coordinates HUD */}
              <div className="font-mono text-[9px] tracking-widest text-cyan/80 pl-2 mt-1">
                ▸ ARTIFACT_001 / EST.2076
              </div>
            </div>
            <div className="absolute -top-2 right-0 font-mono text-[9px] tracking-widest text-magenta/80">
              STATUS: ALIVE
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="border-y border-cyan/15 bg-deep/60 backdrop-blur overflow-hidden">
          <div className="marquee flex gap-12 py-4 whitespace-nowrap font-mono tracking-[0.3em] text-xs text-bone/60 uppercase">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-12 shrink-0">
                <span>▸ leggi online</span>
                <span className="text-magenta">▸ read or perish</span>
                <span>▸ scarica in pdf / e-book</span>
                <span className="text-cyan">▸ commenta l'autore</span>
                <span>▸ sostieni con donazione</span>
                <span className="text-amber">▸ liberiamo la mente</span>
                <span>▸ libri · racconti · saggi · articoli</span>
                <span className="text-magenta">▸ holo interface v7</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IN EVIDENZA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// in_evidenza</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone tracking-tight">Le opere che mordono</h2>
            <p className="mt-3 font-serif italic text-lg text-bone/65 max-w-xl">
              Selezionate dalla redazione e dai lettori. Pixel e inchiostro digitali, ma con denti.
            </p>
          </div>
          <Link
            to="/catalogo"
            className="font-mono tracking-[0.22em] text-[10px] uppercase text-cyan border-b border-cyan/60 pb-1 hover:text-magenta hover:border-magenta transition-colors self-start md:self-auto"
          >
            ▸ vedi tutto il catalogo
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featured.map((b) => <BookCard key={b.slug} book={b} />)}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="relative py-24 overflow-hidden scanlines">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[16rem] md:text-[22rem] tracking-tighter text-cyan/[0.04] select-none">
            MANIFESTO
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 relative">
          <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// manifesto.txt</div>
          <h2 className="mt-3 font-display text-5xl md:text-7xl leading-none text-bone tracking-tight">
            Tre regole.<br /><span className="text-magenta text-glow-magenta">Niente di più.</span>
          </h2>
          <ol className="mt-12 space-y-6">
            {[
              { n: "01", t: "I diritti restano agli autori.", d: "Chi scrive decide cosa pubblicare, cosa rendere scaricabile, cosa lasciare protetto. Sempre." },
              { n: "02", t: "I lettori contano.", d: "Recensioni, commenti capitolo per capitolo, possibilità di seguire chi ti emoziona. La community è la spina dorsale." },
              { n: "03", t: "Niente algoritmi che urlano.", d: "Filtri trasparenti: più letti, più recenti, per genere. Tu scegli cosa leggere — non un'IA per te." },
            ].map((r) => (
              <li key={r.n} className="glass p-6 md:p-8 grid grid-cols-[auto_1fr] gap-6 md:gap-10 items-baseline">
                <div className="font-display text-5xl md:text-6xl text-cyan text-glow-cyan">{r.n}</div>
                <div>
                  <h3 className="font-display text-2xl md:text-3xl text-bone tracking-tight">{r.t}</h3>
                  <p className="mt-3 font-serif italic text-bone/70 text-base md:text-lg max-w-2xl leading-relaxed">{r.d}</p>
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
            <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// ultime_pubblicazioni</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone tracking-tight">Appena usciti</h2>
          </div>
          <div className="font-mono text-[10px] tracking-widest text-cyan/60 uppercase blink">
            uplink in tempo reale
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {fresh.map((b) => <BookCard key={b.slug} book={b} />)}
        </div>
      </section>

      {/* CTA AUTORI / LETTORI */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pb-24">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass p-10 md:p-14 hud-frame">
            <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// per_gli_autori</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone leading-none tracking-tight">
              Hai qualcosa<br />da dire?
            </h2>
            <p className="mt-6 font-serif italic text-lg text-bone/70 max-w-md">
              Pubblica direttamente: libri, racconti, saggi o articoli. Mantieni i diritti, scegli cosa rendere scaricabile, ricevi donazioni dai lettori che ti seguono.
            </p>
            <Link to="/auth/profilo-autore" className="mt-8 inline-flex items-center gap-3 border border-cyan bg-cyan/10 text-cyan px-7 py-4 font-mono tracking-[0.22em] text-[11px] uppercase hover:bg-cyan hover:text-void hover:glow-cyan transition-all">
              ▸ Crea profilo autore
            </Link>
          </div>
          <div className="glass p-10 md:p-14 hud-frame-x relative">
            <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// per_i_lettori</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-bone leading-none tracking-tight">
              Vuoi solo<br /><span className="text-magenta text-glow-magenta">leggere?</span>
            </h2>
            <p className="mt-6 font-serif italic text-lg text-bone/70 max-w-md">
              Accesso gratuito a tutti i contenuti pubblici. Commenta, segui gli autori, scarica nei limiti previsti, sostieni chi ami con una donazione libera.
            </p>
            <Link to="/catalogo" className="mt-8 inline-flex items-center gap-3 border border-magenta bg-magenta/10 text-magenta px-7 py-4 font-mono tracking-[0.22em] text-[11px] uppercase hover:bg-magenta hover:text-void hover:glow-magenta transition-all">
              ◆ Inizia a leggere
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
