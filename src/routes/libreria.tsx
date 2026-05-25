import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";

type LibreriaEntry = {
  id: string;
  stato: "da_leggere" | "in_lettura" | "letto";
  book_id: string;
  books: {
    slug: string;
    titolo: string;
    author_name: string | null;
    copertina_url: string | null;
    genere: string;
    anno: number | null;
  } | null;
};

const STATI = ["da_leggere", "in_lettura", "letto"] as const;
const STATO_LABEL: Record<string, string> = {
  da_leggere: "Da leggere",
  in_lettura: "In lettura",
  letto: "Letto ✓",
};
const STATO_BADGE: Record<string, string> = {
  da_leggere: "bg-amber text-void",
  in_lettura: "bg-cyan text-void",
  letto: "bg-magenta text-void",
};

const GENERI = [
  { value: "libro",      label: "Libri",      code: "SHELF_01" },
  { value: "racconto",   label: "Racconti",   code: "SHELF_02" },
  { value: "saggio",     label: "Saggi",      code: "SHELF_03" },
  { value: "articolo",   label: "Articoli",   code: "SHELF_04" },
  { value: "novelle", label: "Novelle", code: "SHELF_05" },
  { value: "poesia",     label: "Poesie",     code: "SHELF_06" },
] as const;

export const Route = createFileRoute("/libreria")({
  head: () => ({
    meta: [
      { title: "La mia libreria — Liberiamo la mente" },
      { name: "description", content: "I tuoi scaffali personali organizzati per genere." },
    ],
  }),
  component: LibreriaPage,
});

function BookCover({ entry, onCambiaStato, onRimuovi }: {
  entry: LibreriaEntry;
  onCambiaStato: (id: string, stato: string) => void;
  onRimuovi: (id: string) => void;
}) {
  const book = entry.books;
  if (!book) return null;

  return (
    <div className="group relative flex-shrink-0 w-28">
      <Link to="/leggi/$slug" params={{ slug: book.slug }} className="block relative">
        <div className="relative aspect-[3/4] overflow-hidden bg-void ring-1 ring-white/10 group-hover:ring-cyan/50 transition-all duration-300">
          <span className="absolute top-1 left-1 w-2.5 h-2.5 border-l border-t border-cyan/70 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 border-r border-t border-cyan/70 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-l border-b border-cyan/70 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-r border-b border-cyan/70 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />

          <img
            src={book.copertina_url ?? logo}
            alt={book.titolo}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-60"
          />

          {/* Status badge */}
          <span className={`absolute top-1.5 left-1.5 z-10 font-mono text-[7px] tracking-widest uppercase px-1.5 py-0.5 ${STATO_BADGE[entry.stato]}`}>
            {entry.stato === "in_lettura" ? "▶" : entry.stato === "letto" ? "✓" : "◈"}
          </span>

          {/* Overlay hover */}
          <div className="absolute inset-0 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-void/95 via-void/50 to-transparent">
            <p className="font-display text-[11px] leading-tight text-bone line-clamp-3">{book.titolo}</p>
            <p className="mt-0.5 font-mono text-[8px] tracking-widest text-cyan/70 uppercase truncate">{book.author_name ?? "Autore"}</p>
          </div>
        </div>
      </Link>

      <p className="mt-1.5 font-mono text-[8px] tracking-wide text-bone truncate text-center group-hover:opacity-0 transition-opacity leading-tight">
        {book.titolo}
      </p>

      {/* Controlli su hover */}
      <div className="absolute -bottom-10 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex flex-col gap-1 pt-1">
        <select
          value={entry.stato}
          onChange={e => { e.stopPropagation(); onCambiaStato(entry.id, e.target.value); }}
          onClick={e => e.stopPropagation()}
          className="w-full font-mono text-[7px] uppercase tracking-widest border border-cyan/50 bg-void/95 text-bone px-1 py-1 cursor-pointer"
        >
          {STATI.map(s => <option key={s} value={s}>{STATO_LABEL[s]}</option>)}
        </select>
        <button
          onClick={() => onRimuovi(entry.id)}
          className="w-full font-mono text-[7px] uppercase tracking-widest text-magenta hover:text-bone border border-magenta/50 hover:border-magenta bg-void/95 py-1 transition-colors cursor-pointer"
        >
          ✕ rimuovi
        </button>
      </div>
    </div>
  );
}

function LibreriaPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LibreriaEntry[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) { window.location.replace("/auth"); return; }
      const { data } = await supabase
        .from("libreria")
        .select("id, stato, book_id, books(slug, titolo, author_name, copertina_url, genere, anno)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setEntries((data ?? []) as unknown as LibreriaEntry[]);
      setLoading(false);
    };
    init();
  }, []);

  const handleCambiaStato = async (entryId: string, newStato: string) => {
    await supabase.from("libreria").update({ stato: newStato }).eq("id", entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, stato: newStato as LibreriaEntry["stato"] } : e));
  };

  const handleRimuovi = async (entryId: string) => {
    await supabase.from("libreria").delete().eq("id", entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const ultimi = entries.slice(0, 6);
  const total = entries.length;
  const genreConfig = GENERI.find(g => g.value === selectedGenre);
  const genreEntries = selectedGenre ? entries.filter(e => e.books?.genere === selectedGenre) : [];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// LA_MIA_LIBRERIA"
        title="La mia libreria"
        subtitle={loading ? "" : total === 0 ? "I tuoi scaffali personali." : `${total} ${total === 1 ? "opera" : "opere"} nei tuoi scaffali.`}
      >
        {loading ? (
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento scaffali...</p>
        ) : total === 0 ? (
          <div className="border border-dashed border-cyan/15 py-20 text-center">
            <div className="font-display text-6xl text-bone/10 mb-4">◊</div>
            <p className="font-serif italic text-bone/40 text-lg">Nessun libro ancora.</p>
            <p className="mt-2 font-serif italic text-bone/30">Vai al{" "}
              <Link to="/catalogo" className="text-cyan hover:underline">catalogo</Link>
              {" "}e aggiungi le opere che ti interessano.
            </p>
          </div>
        ) : (
          <div className="space-y-10">

            {/* FILTRO GENERE — sempre visibile, in cima */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="font-mono text-[9px] tracking-[0.35em] text-bone uppercase">// PER GENERE</span>
                <div className="flex-1 h-px bg-cyan/10" />
                {selectedGenre && (
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className="font-mono text-[9px] tracking-widest uppercase text-bone hover:text-cyan transition-colors cursor-pointer"
                  >
                    ← recenti
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {GENERI.map(g => {
                  const count = entries.filter(e => e.books?.genere === g.value).length;
                  const isEmpty = count === 0;
                  const isActive = selectedGenre === g.value;
                  return (
                    <button
                      key={g.value}
                      onClick={() => !isEmpty && setSelectedGenre(isActive ? null : g.value)}
                      className={`font-mono tracking-[0.2em] text-[10px] uppercase px-4 py-2 border transition-all ${
                        isActive
                          ? "border-cyan bg-cyan/15 text-cyan"
                          : isEmpty
                            ? "border-cyan/15 text-bone/30 cursor-default"
                            : "border-cyan/50 text-bone hover:border-cyan hover:text-cyan cursor-pointer"
                      }`}
                    >
                      ◆ {g.label}
                      <span className={`ml-2 ${isActive ? "text-cyan/80" : isEmpty ? "text-bone/30" : "text-bone/60"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ULTIMI AGGIUNTI — sotto il filtro, visibile solo se nessun genere selezionato */}
            {!selectedGenre && (
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <span className="font-mono text-[9px] tracking-[0.35em] text-bone uppercase">// RECENTI</span>
                  <div className="flex-1 h-px bg-cyan/10" />
                  <span className="font-mono text-[10px] tracking-widest uppercase border border-cyan/40 text-cyan px-3 py-1">
                    Ultimi aggiunti
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {ultimi.map(entry => (
                    <BookCover key={entry.id} entry={entry} onCambiaStato={handleCambiaStato} onRimuovi={handleRimuovi} />
                  ))}
                </div>
                <div className="mt-6 h-px bg-cyan/10" />
                <div className="h-3 bg-gradient-to-b from-black/15 to-transparent" />
              </div>
            )}

            {/* SCAFFALI PER STATO — visibili quando un genere è selezionato */}
            {selectedGenre && genreConfig && (
              <div className="space-y-10">
                {[
                  { stato: "in_lettura",  label: "In lettura",  line: "bg-cyan/40",    badge: "border-cyan/60 text-cyan" },
                  { stato: "da_leggere",  label: "Da leggere",  line: "bg-amber/30",   badge: "border-amber/60 text-amber" },
                  { stato: "letto",       label: "Letti",       line: "bg-magenta/35", badge: "border-magenta/60 text-magenta" },
                ].map(shelf => {
                  const shelfEntries = genreEntries.filter(e => e.stato === shelf.stato);
                  return (
                    <div key={shelf.stato}>
                      {/* Intestazione scaffale */}
                      <div className="flex items-center gap-4 mb-5">
                        <span className="font-mono text-[9px] tracking-[0.35em] text-bone uppercase">{genreConfig.label}</span>
                        <div className="flex-1 h-px bg-white/10" />
                        <span className={`font-mono text-[10px] tracking-widest uppercase border px-3 py-1 ${shelf.badge}`}>
                          {shelf.label}
                        </span>
                        <span className="font-mono text-[9px] text-bone/50">{shelfEntries.length}</span>
                      </div>

                      {shelfEntries.length === 0 ? (
                        <div className="border border-dashed border-white/10 py-8 text-center">
                          <p className="font-serif italic text-bone/30 text-sm">Scaffale vuoto</p>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="overflow-x-auto pb-14 scrollbar-thin scrollbar-thumb-cyan/20 scrollbar-track-transparent">
                            <div className="flex gap-4" style={{ width: "max-content" }}>
                              {shelfEntries.map(entry => (
                                <BookCover key={entry.id} entry={entry} onCambiaStato={handleCambiaStato} onRimuovi={handleRimuovi} />
                              ))}
                            </div>
                          </div>
                          {/* Plancia scaffale */}
                          <div className={`h-px w-full ${shelf.line}`} />
                          <div className="h-3 w-full bg-gradient-to-b from-black/20 to-transparent" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </PageShell>
      <SiteFooter />
    </div>
  );
}
