import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCestinoTranslation } from "@/lib/cestinoI18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";

type CestinatoBook = {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string | null;
  genere: string;
  anno: number | null;
  copertina_url: string | null;
  author_name: string | null;
  voti_cestino: number;
};

export const Route = createFileRoute("/cestino")({
  head: () => ({
    meta: [
      { title: "Cestino degli Scritti Perduti — Liberiamo la mente" },
      { name: "description", content: "Opere dimenticate in attesa di un giudizio. Leggi, vota, recupera." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Liberiamo la mente" },
      { property: "og:url", content: "https://liberiamo2076.com/cestino" },
      { property: "og:title", content: "Cestino degli Scritti Perduti — Liberiamo la mente" },
      { property: "og:description", content: "Opere dimenticate in attesa di un giudizio. Cinque voti bastano per riportare un'opera perduta in catalogo." },
      { property: "og:image", content: "https://liberiamo2076.com/logo-liberiamo.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cestino degli Scritti Perduti — Liberiamo la mente" },
      { name: "twitter:description", content: "Cinque voti bastano per riportare un'opera perduta in catalogo." },
      { name: "twitter:image", content: "https://liberiamo2076.com/logo-liberiamo.jpg" },
    ],
  }),
  component: CestinoPage,
});

function CestinoPage() {
  const { t } = useTranslation();
  const [books, setBooks] = useState<CestinatoBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [votiFiltro, setVotiFiltro] = useState<number | "all">("all");
  const [cestinoTooltip, setCestinoTooltip] = useState<string | null>(null);
  useEffect(() => { setCestinoTooltip(getCestinoTranslation()); }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("books")
        .select("id, slug, titolo, descrizione, genere, anno, copertina_url, author_name, voti_cestino")
        .eq("cestinato", true)
        .order("created_at", { ascending: false });
      setBooks(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (votiFiltro === "all") return books;
    return books.filter(b => b.voti_cestino === votiFiltro);
  }, [books, votiFiltro]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative scanlines overflow-hidden">
        <div className="absolute -top-20 right-1/3 w-[500px] h-[500px] rounded-full bg-magenta/10 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 relative">
          <div className="font-mono tracking-[0.3em] text-[10px] text-magenta uppercase">// ARCHIVIO/PERDUTI</div>
          <div className="group relative inline-block">
            <h1 className="mt-3 font-display text-5xl md:text-7xl leading-[0.95] text-bone tracking-tight">
              Cestino degli<br /><span className="text-magenta text-glow-magenta">Scritti Perduti.</span>
            </h1>
            {cestinoTooltip && (
              <p className="pointer-events-none mt-3 font-display text-4xl md:text-6xl text-cyan text-glow-cyan tracking-tight leading-tight opacity-0 scale-0 origin-top group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                {cestinoTooltip}
              </p>
            )}
          </div>
          <p className="mt-6 font-serif italic text-xl text-bone/70 max-w-2xl">
            {t("cestino.desc")}
          </p>
        </div>
      </section>

      {books.length > 0 && (
        <section className="border-y border-magenta/15 bg-deep/40 backdrop-blur sticky top-[5.75rem] z-30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap gap-2 items-center">
            <span className="font-mono tracking-[0.22em] text-[10px] uppercase text-bone/50">// voti</span>
            {(["all", 0, 1, 2, 3, 4] as const).map(v => (
              <button
                key={v}
                onClick={() => setVotiFiltro(v)}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-all ${
                  votiFiltro === v
                    ? "border-magenta bg-magenta/15 text-magenta"
                    : "border-magenta/20 text-bone/50 hover:border-magenta/50 hover:text-bone/80"
                }`}
              >
                {v === "all" ? t("cestino.tutti") : `${v} vot${v === 1 ? "o" : "i"}`}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 py-12 flex-1 w-full">
        {loading ? (
          <p className="font-mono text-cyan text-sm animate-pulse">▸ {t("cestino.caricamento")}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 glass p-12 hud-frame">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">
              {books.length === 0 ? t("cestino.vuoto") : t("cestino.nessunVoto")}
            </p>
            <Link to="/catalogo" className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-cyan border-b border-cyan/60 pb-1">
              ▸ {t("cestino.vaiCatalogo")}
            </Link>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((b, i) => (
              <div key={b.id}>
                {i > 0 && <div className="border-t border-magenta/[0.08]" />}
                <div className="py-8 flex gap-6 items-start">
                  <Link to="/leggi/$slug" params={{ slug: b.slug }} className="flex-shrink-0">
                    <img
                      src={b.copertina_url ?? logo}
                      alt={b.titolo}
                      className="w-20 sm:w-24 object-cover ring-1 ring-magenta/20 hover:ring-magenta/50 transition-all"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[9px] tracking-[0.3em] text-magenta/50 uppercase mb-1">
                      {b.author_name ?? "Autore"}{b.anno ? ` · ${b.anno}` : ""} · {b.genere}
                    </div>
                    <Link to="/leggi/$slug" params={{ slug: b.slug }}>
                      <h2 className="font-display text-xl sm:text-2xl text-bone tracking-tight leading-snug hover:text-magenta transition-colors">
                        {b.titolo}
                      </h2>
                    </Link>
                    {b.descrizione && (
                      <p className="mt-3 font-serif italic text-bone/60 leading-relaxed line-clamp-3">
                        {b.descrizione}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-5 flex-wrap">
                      <Link
                        to="/leggi/$slug"
                        params={{ slug: b.slug }}
                        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-magenta/70 hover:text-magenta border-b border-magenta/20 hover:border-magenta pb-0.5 transition-all"
                      >
                        ▸ {t("cestino.leggiVota")}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 5 }, (_, idx) => (
                          <span
                            key={idx}
                            className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                              idx < b.voti_cestino ? "bg-magenta border-magenta" : "border-bone/20"
                            }`}
                          />
                        ))}
                        <span className="font-mono text-[9px] tracking-widest text-bone/40 uppercase ml-1">
                          {b.voti_cestino}/5 {t("cestino.votiLabel")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
