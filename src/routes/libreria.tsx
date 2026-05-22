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

const SHELF_CONFIG = [
  { stato: "in_lettura",  label: "In lettura",  code: "SHELF_01", accent: "cyan",    line: "bg-cyan/30",    badge: "text-cyan border-cyan/40" },
  { stato: "da_leggere",  label: "Da leggere",  code: "SHELF_02", accent: "amber",   line: "bg-amber/20",   badge: "text-amber border-amber/40" },
  { stato: "letto",       label: "Letti",        code: "SHELF_03", accent: "magenta", line: "bg-magenta/25", badge: "text-magenta border-magenta/40" },
] as const;

export const Route = createFileRoute("/libreria")({
  head: () => ({
    meta: [
      { title: "La mia libreria — Liberiamo la mente" },
      { name: "description", content: "I tuoi scaffali personali: libri da leggere, in lettura e già letti." },
    ],
  }),
  component: LibreriaPage,
});

function BookOnShelf({ entry, onCambiaStato, onRimuovi }: {
  entry: LibreriaEntry;
  onCambiaStato: (id: string, stato: string) => void;
  onRimuovi: (id: string) => void;
}) {
  const book = entry.books;
  if (!book) return null;

  return (
    <div className="group relative flex-shrink-0 w-28">
      {/* Copertina */}
      <Link to="/leggi/$slug" params={{ slug: book.slug }} className="block relative">
        <div className="relative aspect-[3/4] overflow-hidden bg-void ring-1 ring-cyan/15 group-hover:ring-cyan/50 transition-all duration-300">
          {/* HUD corners */}
          <span className="absolute top-1 left-1 w-2.5 h-2.5 border-l border-t border-cyan/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 border-r border-t border-cyan/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-l border-b border-cyan/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-r border-b border-cyan/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />

          <img
            src={book.copertina_url ?? logo}
            alt={book.titolo}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
          />

          {/* Overlay hover con titolo */}
          <div className="absolute inset-0 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-void/95 via-void/60 to-transparent">
            <p className="font-display text-[11px] leading-tight text-bone line-clamp-3">{book.titolo}</p>
            <p className="mt-0.5 font-mono text-[8px] tracking-widest text-cyan/70 uppercase truncate">{book.author_name ?? "Autore"}</p>
          </div>
        </div>
      </Link>

      {/* Titolo sotto (visibile a riposo) */}
      <p className="mt-1.5 font-mono text-[8px] tracking-wide text-bone/50 truncate text-center group-hover:opacity-0 transition-opacity">
        {book.titolo}
      </p>

      {/* Controlli — appaiono sull'hover sotto la copertina */}
      <div className="absolute -bottom-10 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex flex-col gap-1 pt-1">
        <select
          value={entry.stato}
          onChange={e => { e.stopPropagation(); onCambiaStato(entry.id, e.target.value); }}
          onClick={e => e.stopPropagation()}
          className="w-full font-mono text-[7px] uppercase tracking-widest border border-cyan/30 bg-void/90 text-bone/70 px-1 py-1 cursor-pointer"
        >
          {STATI.map(s => (
            <option key={s} value={s}>{STATO_LABEL[s]}</option>
          ))}
        </select>
        <button
          onClick={() => onRimuovi(entry.id)}
          className="w-full font-mono text-[7px] uppercase tracking-widest text-magenta/60 hover:text-magenta border border-magenta/20 hover:border-magenta/50 bg-void/90 py-1 transition-colors cursor-pointer"
        >
          ✕ rimuovi
        </button>
      </div>
    </div>
  );
}

function Shelf({ config, entries, onCambiaStato, onRimuovi }: {
  config: typeof SHELF_CONFIG[number];
  entries: LibreriaEntry[];
  onCambiaStato: (id: string, stato: string) => void;
  onRimuovi: (id: string) => void;
}) {
  return (
    <div className="mb-16">
      {/* Intestazione scaffale */}
      <div className="flex items-center gap-4 mb-5">
        <span className="font-mono text-[9px] tracking-[0.35em] text-bone/40 uppercase">{config.code}</span>
        <div className="flex-1 h-px bg-cyan/10" />
        <span className={`font-mono text-[10px] tracking-widest uppercase border px-3 py-1 ${config.badge}`}>
          {config.label}
        </span>
        <span className="font-mono text-[9px] text-bone/30">{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-cyan/10 py-10 text-center">
          <p className="font-serif italic text-bone/25 text-sm">Scaffale vuoto</p>
        </div>
      ) : (
        <div className="relative">
          {/* Libri su scaffale — scroll orizzontale */}
          <div className="flex gap-4 overflow-x-auto pb-14 scrollbar-thin scrollbar-thumb-cyan/20 scrollbar-track-transparent">
            {entries.map(entry => (
              <BookOnShelf
                key={entry.id}
                entry={entry}
                onCambiaStato={onCambiaStato}
                onRimuovi={onRimuovi}
              />
            ))}
          </div>
          {/* Plancia dello scaffale */}
          <div className={`h-px w-full ${config.line}`} />
          <div className="h-3 w-full bg-gradient-to-b from-black/20 to-transparent" />
        </div>
      )}
    </div>
  );
}

function LibreriaPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LibreriaEntry[]>([]);

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

  const total = entries.length;

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
          <div>
            {SHELF_CONFIG.map(config => (
              <Shelf
                key={config.stato}
                config={config}
                entries={entries.filter(e => e.stato === config.stato)}
                onCambiaStato={handleCambiaStato}
                onRimuovi={handleRimuovi}
              />
            ))}
          </div>
        )}
      </PageShell>
      <SiteFooter />
    </div>
  );
}
