import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell } from "@/components/HudPanel";
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

const STATO_TONE: Record<string, string> = {
  da_leggere: "border-cyan/40 text-cyan",
  in_lettura: "border-amber/40 text-amber",
  letto: "border-magenta/40 text-magenta",
};

export const Route = createFileRoute("/libreria")({
  head: () => ({
    meta: [
      { title: "La mia libreria — Liberiamo la mente" },
      { name: "description", content: "I tuoi scaffali personali: libri da leggere, in lettura e già letti." },
    ],
  }),
  component: LibreriaPage,
});

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <PageShell code="// LA_MIA_LIBRERIA" title="La mia libreria" subtitle="">
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento...</p>
        </PageShell>
        <SiteFooter />
      </div>
    );
  }

  const sections = [
    { stato: "in_lettura", label: "In lettura", tone: "cyan" as const },
    { stato: "da_leggere", label: "Da leggere", tone: "cyan" as const },
    { stato: "letto", label: "Letti", tone: "magenta" as const },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// LA_MIA_LIBRERIA" title="La mia libreria" subtitle="I tuoi scaffali personali.">
        {entries.length === 0 ? (
          <HudPanel label="scaffale vuoto">
            <p className="font-serif italic text-bone/50 text-center py-10">
              Nessun libro ancora. Vai al{" "}
              <Link to="/catalogo" className="text-cyan hover:underline">catalogo</Link>
              {" "}e aggiungi le opere che ti interessano.
            </p>
          </HudPanel>
        ) : (
          <div className="space-y-6">
            {sections.map(section => {
              const sectionEntries = entries.filter(e => e.stato === section.stato);
              if (sectionEntries.length === 0) return null;
              return (
                <HudPanel key={section.stato} label={section.label} code={`${sectionEntries.length}`} tone={section.tone}>
                  <div className="space-y-2">
                    {sectionEntries.map(entry => {
                      const book = entry.books;
                      if (!book) return null;
                      return (
                        <div key={entry.id} className="flex items-center gap-4 border border-cyan/10 p-3 hover:border-cyan/25 transition-colors">
                          <Link to="/leggi/$slug" params={{ slug: book.slug }} className="flex-shrink-0">
                            <img
                              src={book.copertina_url ?? logo}
                              alt=""
                              className="w-10 h-14 object-cover ring-1 ring-cyan/20 hover:ring-cyan/60 transition-all"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to="/leggi/$slug" params={{ slug: book.slug }} className="hover:text-cyan transition-colors">
                              <div className="font-display text-sm tracking-tight text-bone truncate">{book.titolo}</div>
                            </Link>
                            <div className="font-mono text-[9px] tracking-widest text-bone/50 uppercase mt-0.5">
                              {book.author_name ?? "Autore"} · {book.genere} · {book.anno ?? "—"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={entry.stato}
                              onChange={e => handleCambiaStato(entry.id, e.target.value)}
                              className={`font-mono text-[9px] uppercase tracking-widest border bg-void/40 px-2 py-1.5 cursor-pointer transition-colors ${STATO_TONE[entry.stato]}`}
                            >
                              {STATI.map(s => (
                                <option key={s} value={s}>{STATO_LABEL[s]}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRimuovi(entry.id)}
                              title="Rimuovi dalla libreria"
                              className="font-mono text-[10px] text-magenta/40 hover:text-magenta border border-transparent hover:border-magenta/30 px-2 py-1.5 transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </HudPanel>
              );
            })}
          </div>
        )}
      </PageShell>
      <SiteFooter />
    </div>
  );
}
