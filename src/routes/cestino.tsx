import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
      { property: "og:title", content: "Cestino degli Scritti Perduti — Liberiamo la mente" },
      { property: "og:description", content: "Cinque voti bastano per riportare un'opera perduta in catalogo." },
    ],
  }),
  component: CestinoPage,
});

function CestinoPage() {
  const [books, setBooks] = useState<CestinatoBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoreFiltro, setAutoreFiltro] = useState<string>("all");
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

  const autori = useMemo(() => {
    const set = new Set(books.map(b => b.author_name ?? "Autore"));
    return [...set].sort();
  }, [books]);

  const filtered = useMemo(() => {
    if (autoreFiltro === "all") return books;
    return books.filter(b => (b.author_name ?? "Autore") === autoreFiltro);
  }, [books, autoreFiltro]);

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
            Opere dimenticate. Storie che aspettano cinque voti per essere recuperate dalla memoria.
            Leggi. Decidi. Salva.
          </p>
        </div>
      </section>

      {autori.length > 1 && (
        <section className="border-y border-magenta/15 bg-deep/40 backdrop-blur sticky top-[5.75rem] z-30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap gap-2 items-center">
            <span className="font-mono tracking-[0.22em] text-[10px] uppercase text-bone/50">autore:</span>
            <button
              onClick={() => setAutoreFiltro("all")}
              className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-all ${
                autoreFiltro === "all"
                  ? "border-magenta bg-magenta/15 text-magenta"
                  : "border-magenta/20 text-bone/50 hover:border-magenta/50 hover:text-bone/80"
              }`}
            >
              Tutti
            </button>
            {autori.map(a => (
              <button
                key={a}
                onClick={() => setAutoreFiltro(a)}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-all ${
                  autoreFiltro === a
                    ? "border-magenta bg-magenta/15 text-magenta"
                    : "border-magenta/20 text-bone/50 hover:border-magenta/50 hover:text-bone/80"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 py-12 flex-1 w-full">
        {loading ? (
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 glass p-12 hud-frame">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">
              {books.length === 0
                ? "Nessuno scritto perduto. Il cestino è vuoto."
                : "Nessun testo in questo archivio per questo autore."}
            </p>
            <Link to="/catalogo" className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-cyan border-b border-cyan/60 pb-1">
              ▸ Vai al catalogo
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
                        ▸ Leggi e vota
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
                          {b.voti_cestino}/5 voti
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
