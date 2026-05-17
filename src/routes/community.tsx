import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { books } from "@/data/books";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Liberiamo la mente" },
      { name: "description", content: "Recensioni, commenti, autori da seguire. La spina dorsale della biblioteca olografica." },
    ],
  }),
  component: CommunityPage,
});

const reviews = [
  { user: "@anthea_dl", book: "Read or Perish", text: "Un saggio che ti tira fuori dal letto alle 4 e mezza. Tagliente come un cristallo.", time: "2h fa", rate: 5 },
  { user: "@marco_r", book: "Il silenzio delle pagine", text: "La bibliotecaria clandestina è il personaggio dell'anno. Capitolo III mi ha fermato.", time: "8h fa", rate: 5 },
  { user: "@iris_c", book: "Geografie private", text: "Le mappe come metafora funzionano. La struttura forse poteva osare di più.", time: "1g fa", rate: 4 },
  { user: "@tommaso_b", book: "Lessico della rivolta", text: "Cento parole, cento bisturi. Da tenere sul comodino.", time: "2g fa", rate: 5 },
];

type BookResult = { slug: string; titolo: string; author_name: string };

function BookSearchField({
  selected,
  onSelect,
  onClear,
}: {
  selected: BookResult | null;
  onSelect: (b: BookResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("books")
        .select("slug, titolo, author_name")
        .or(`titolo.ilike.%${query}%,author_name.ilike.%${query}%`)
        .limit(6);
      setResults(data ?? []);
      setOpen(true);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const labelClass = "font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase";
  const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";

  if (selected) {
    return (
      <div>
        <span className={labelClass}>↳ opera selezionata</span>
        <div className="mt-2 flex items-center gap-3 border border-cyan/40 bg-cyan/5 px-4 py-3">
          <span className="font-mono text-[9px] text-cyan tracking-widest">▸</span>
          <div className="flex-1 min-w-0">
            <span className="font-serif text-bone">{selected.titolo}</span>
            {selected.author_name && (
              <span className="font-serif italic text-bone/50 text-sm ml-2">— {selected.author_name}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-bone/30 hover:text-magenta transition-colors text-sm shrink-0"
            title="Cambia opera"
          >✕</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <span className={labelClass}>↳ a quale opera si riferisce?</span>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Cerca per titolo o autore..."
          className={inputClass}
          autoComplete="off"
        />
        {searching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[9px] text-cyan/50 animate-pulse">
            ◆
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full border border-cyan/30 bg-void shadow-lg">
          {results.map((b) => (
            <button
              key={b.slug}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(b);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-baseline gap-3 hover:bg-cyan/10 transition-colors border-b border-cyan/10 last:border-0"
            >
              <span className="font-mono text-[9px] text-cyan/60 tracking-widest shrink-0">▸</span>
              <span className="font-serif text-bone text-sm">{b.titolo}</span>
              {b.author_name && (
                <span className="font-serif italic text-bone/45 text-xs ml-auto shrink-0">— {b.author_name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && !searching && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-20 left-0 right-0 top-full border border-cyan/30 bg-void px-4 py-3">
          <span className="font-mono text-[10px] text-bone/40 tracking-widest uppercase">nessuna opera trovata</span>
        </div>
      )}
    </div>
  );
}

function CommunityPage() {
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/COMMUNITY" title="Community" subtitle="Niente like sterili. Solo persone che leggono e dicono cosa pensano.">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Feed */}
          <div className="space-y-4">
            <HudPanel label="ultime_recensioni" tone="cyan">
              <div className="space-y-5">
                {reviews.map((r, i) => (
                  <div key={i} className="border-l-2 border-cyan/40 pl-4 hover:border-magenta transition-colors">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div>
                        <span className="font-mono text-cyan text-sm">{r.user}</span>
                        <span className="font-mono text-[10px] tracking-widest text-bone/40 uppercase ml-3">▸ {r.book}</span>
                      </div>
                      <div className="font-mono text-[10px] tracking-widest text-bone/40">{r.time} · {"★".repeat(r.rate)}</div>
                    </div>
                    <p className="mt-2 font-serif italic text-bone/85 leading-relaxed">"{r.text}"</p>
                  </div>
                ))}
              </div>
            </HudPanel>

            <HudPanel label="aggiungi_recensione" tone="magenta">
              <h3 className="font-display text-xl text-bone tracking-tight">Lascia la tua</h3>
              <div className="mt-4 space-y-4">
                <BookSearchField
                  selected={selectedBook}
                  onSelect={setSelectedBook}
                  onClear={() => setSelectedBook(null)}
                />
                <div>
                  <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ testo</span>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Cosa ne pensi del libro o del capitolo?"
                    className="mt-2 w-full min-h-28 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-magenta transition-all"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-1 items-center">
                  <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase mr-2">↳ voto</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className={`font-display text-2xl transition-colors ${
                        s <= (hoverRating || rating) ? "text-amber" : "text-amber/25"
                      }`}
                    >★</button>
                  ))}
                </div>
                <HudButton
                  variant="magenta"
                  disabled={!selectedBook || !reviewText.trim() || rating === 0}
                >
                  ◆ Pubblica
                </HudButton>
              </div>
            </HudPanel>
          </div>

          {/* Autori da seguire */}
          <div className="space-y-4">
            <HudPanel label="autori_attivi" code="LIVE" tone="amber">
              <ul className="space-y-3">
                {books.slice(0, 5).map((b) => (
                  <li key={b.slug} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan/40 to-magenta/30 ring-1 ring-cyan/40 flex items-center justify-center font-display text-bone">
                      {b.author[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm text-bone truncate">{b.author}</div>
                      <div className="font-mono text-[9px] tracking-widest text-bone/50 uppercase">▸ {b.genre}</div>
                    </div>
                    <button className="font-mono text-[10px] tracking-widest text-cyan border border-cyan/40 px-2 py-1 hover:bg-cyan hover:text-void transition-all uppercase">
                      +seg
                    </button>
                  </li>
                ))}
              </ul>
            </HudPanel>

            <HudPanel label="trending" tone="cyan">
              <ul className="space-y-2 font-mono text-xs text-bone/70">
                <li>#01 ▸ <span className="text-cyan">read or perish</span></li>
                <li>#02 ▸ silenzio delle pagine</li>
                <li>#03 ▸ <span className="text-magenta">manuale del disertore</span></li>
                <li>#04 ▸ controcanto</li>
                <li>#05 ▸ lessico della rivolta</li>
              </ul>
            </HudPanel>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
