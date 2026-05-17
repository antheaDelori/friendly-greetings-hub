import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/lib/supabase";

type AuthorEntry = {
  name: string;
  count: number;
  generi: string[];
};


export const Route = createFileRoute("/autori")({
  head: () => ({
    meta: [
      { title: "Autori — Liberiamo la mente" },
      { name: "description", content: "Elenco alfabetico di tutti gli autori presenti in biblioteca." },
      { property: "og:title", content: "Autori — Liberiamo la mente" },
    ],
  }),
  component: AutoriPage,
});

function AutoriPage() {
  const { t } = useTranslation();
  const [authors, setAuthors] = useState<AuthorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("books")
        .select("author_name, genere")
        .eq("disponibile", true)
        .eq("cestinato", false);

      if (!data) { setLoading(false); return; }

      const map = new Map<string, Set<string>>();
      for (const b of data) {
        const name = b.author_name ?? "Autore";
        if (!map.has(name)) map.set(name, new Set());
        map.get(name)!.add(b.genere ?? "libro");
      }

      const list: AuthorEntry[] = [...map.entries()]
        .map(([name, generiSet]) => ({
          name,
          count: 0,
          generi: [...generiSet],
        }));

      // contiamo le opere per autore
      const countMap = new Map<string, number>();
      for (const b of data) {
        const name = b.author_name ?? "Autore";
        countMap.set(name, (countMap.get(name) ?? 0) + 1);
      }
      for (const a of list) a.count = countMap.get(a.name) ?? 0;

      list.sort((a, b) => a.name.localeCompare(b.name, "it"));
      setAuthors(list);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(a => a.name.toLowerCase().includes(q));
  }, [authors, search]);

  const byLetter = useMemo(() => {
    const map = new Map<string, AuthorEntry[]>();
    for (const a of filtered) {
      const letter = a.name[0]?.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") ?? "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(a);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const letters = byLetter.map(([l]) => l);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative scanlines overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan/10 blur-[120px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 relative">
          <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// MODULE/AUTHORS</div>
          <h1 className="mt-3 font-display text-5xl md:text-7xl leading-[0.95] text-bone tracking-tight">
            {t("autoriPage.titolo")}<br /><span className="text-cyan text-glow-cyan">{t("autoriPage.sottotitolo")}</span>
          </h1>
          <p className="mt-6 font-serif italic text-xl text-bone/70 max-w-2xl">
            {t("autoriPage.desc")}
          </p>

          {/* ricerca rapida */}
          <div className="mt-10 glass p-5 hud-frame max-w-xl">
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-cyan text-sm">▸</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("autoriPage.searchPlaceholder")}
                className="w-full bg-transparent border-b border-cyan/30 focus:border-cyan outline-none py-3 pl-6 pr-24 font-mono text-lg text-bone placeholder:text-bone/30 transition-colors"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-widest text-cyan/70 uppercase">
                {filtered.length.toString().padStart(3, "0")} aut.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* indice lettere */}
      {!loading && letters.length > 0 && (
        <section className="border-y border-cyan/15 bg-deep/40 backdrop-blur sticky top-[5.75rem] z-30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap gap-1">
            {letters.map(l => (
              <a
                key={l}
                href={`#lettera-${l}`}
                className="font-mono text-[11px] tracking-widest uppercase px-2.5 py-1 border border-cyan/20 text-bone/50 hover:border-cyan hover:text-cyan transition-all"
              >
                {l}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12 flex-1">
        {loading ? (
          <p className="font-mono text-cyan text-sm animate-pulse">▸ {t("autoriPage.caricamento")}</p>
        ) : byLetter.length === 0 ? (
          <div className="text-center py-24 glass p-12 hud-frame">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">{t("autoriPage.nessunAutore")}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {byLetter.map(([letter, group]) => (
              <div key={letter} id={`lettera-${letter}`}>
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="font-display text-6xl text-cyan/20 leading-none">{letter}</span>
                  <div className="flex-1 border-t border-cyan/10" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map(a => (
                    <Link
                      key={a.name}
                      to="/catalogo"
                      search={{ q: a.name, genre: "", sort: "recenti" }}
                      className="group glass holo-hover p-5 flex flex-col gap-3 relative"
                    >
                      <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-l border-t border-cyan/50" />
                      <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-r border-b border-cyan/50" />
                      <div>
                        <h2 className="font-display text-xl text-bone tracking-tight leading-tight group-hover:text-cyan transition-colors">
                          {a.name}
                        </h2>
                        <div className="font-mono text-[9px] tracking-widest text-bone/30 uppercase mt-1">
                          {a.count} {a.count === 1 ? t("ui.operaSing") : t("ui.operePlur")}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {a.generi.map(g => (
                          <span key={g} className="font-mono text-[8px] tracking-widest uppercase border border-cyan/20 text-cyan/50 px-1.5 py-0.5">
                            {t(`generiTag.${g}`, g)}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
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
