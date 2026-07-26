import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col paper-texture">
      <SiteHeader />

      <main className="mx-auto max-w-2xl w-full px-6 py-16 flex-1">

        <div className="mb-10">
          <div className="font-mono text-[10px] tracking-[0.3em] text-blood/70 uppercase mb-3">// abbonamento autori</div>
          <h1 className="font-display text-4xl text-ink leading-tight">{t("abbonamento.titolo")}</h1>
          <p className="mt-4 font-serif italic text-ink/60 text-lg leading-relaxed">
            {t("abbonamento.sottotitolo")}
          </p>
        </div>

        <div className="border-t border-ink/10 pt-8 space-y-10">

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">{t("abbonamento.sezione1Titolo")}</h2>
            <p className="font-serif text-ink/75 leading-relaxed">
              {t("abbonamento.sezione1Desc")}
            </p>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">{t("abbonamento.sezione2Titolo")}</h2>
            <ul className="space-y-2">
              {[
                t("abbonamento.ottieni01"),
                t("abbonamento.ottieni02"),
                t("abbonamento.ottieni03"),
              ].map(v => (
                <li key={v} className="flex items-start gap-2 font-serif text-sm text-ink/70">
                  <span className="text-blood mt-0.5 shrink-0">◆</span>{v}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">{t("abbonamento.sezione3Titolo")}</h2>
            <p className="font-serif text-ink/75 leading-relaxed mb-4">
              {t("abbonamento.sezione3Intro")}
            </p>
            <ul className="space-y-3">
              {[
                { label: t("abbonamento.costo01Label"), desc: t("abbonamento.costo01Desc") },
                { label: t("abbonamento.costo02Label"), desc: t("abbonamento.costo02Desc") },
                { label: t("abbonamento.costo03Label"), desc: t("abbonamento.costo03Desc") },
                { label: t("abbonamento.costo04Label"), desc: t("abbonamento.costo04Desc") },
              ].map(item => (
                <li key={item.label} className="border-l-2 border-blood/30 pl-4">
                  <div className="font-display tracking-wider text-[11px] text-ink/80 uppercase mb-1">{item.label}</div>
                  <p className="font-serif text-sm text-ink/60 leading-relaxed">{item.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">{t("abbonamento.sezione4Titolo")}</h2>
            <p className="font-serif text-ink/75 leading-relaxed">
              {t("abbonamento.sezione4Desc")}
            </p>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">{t("abbonamento.sezione5Titolo")}</h2>
            <ul className="space-y-2">
              {[
                t("abbonamento.vantaggio01"),
                t("abbonamento.vantaggio02"),
                t("abbonamento.vantaggio03"),
              ].map(v => (
                <li key={v} className="flex items-start gap-2 font-serif text-sm text-ink/70">
                  <span className="text-blood mt-0.5 shrink-0">◆</span>{v}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display tracking-widest text-xs text-blood uppercase mb-4">{t("abbonamento.sezione6Titolo")}</h2>
            <p className="font-serif text-ink/75 leading-relaxed mb-4">
              {t("abbonamento.sezione6Desc")}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-ink/15 p-5">
                <div className="font-display text-2xl text-ink mb-1">{t("abbonamento.piano1Prezzo")}<span className="text-sm text-ink/50">{t("abbonamento.piano1Suffix")}</span></div>
                <p className="font-serif text-sm text-ink/60 leading-relaxed">{t("abbonamento.piano1Desc")}</p>
              </div>
              <div className="border border-blood/40 bg-blood/5 p-5">
                <div className="font-display text-2xl text-ink mb-1">{t("abbonamento.piano2Prezzo")}<span className="text-sm text-ink/50">{t("abbonamento.piano2Suffix")}</span></div>
                <p className="font-serif text-sm text-ink/60 leading-relaxed">{t("abbonamento.piano2Desc")}</p>
              </div>
            </div>
            <p className="font-serif italic text-ink/50 text-sm leading-relaxed mt-4">
              {t("abbonamento.paypalNota")}
            </p>
            <a
              href="https://paypal.me/antheaDelori"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 border border-blood/40 px-5 py-2.5 font-mono tracking-[0.2em] text-xs uppercase text-blood hover:bg-blood/10 transition-all"
            >
              {t("abbonamento.paypalBtn")}
            </a>
          </section>

        </div>

        <div className="mt-12 border-t border-ink/10 pt-8 flex flex-wrap gap-4">
          <Link
            to="/auth/registrazione"
            search={{ autore: true }}
            className="inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-6 py-3 font-mono tracking-[0.2em] text-xs uppercase text-cyan hover:bg-cyan hover:text-void transition-all"
          >
            {t("abbonamento.registratiBtn")}
          </Link>
          <Link
            to="/auth/"
            className="inline-flex items-center gap-2 border border-ink/20 px-6 py-3 font-mono tracking-[0.2em] text-xs uppercase text-ink/50 hover:border-ink/50 hover:text-ink/80 transition-all"
          >
            {t("abbonamento.tornaBtn")}
          </Link>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
