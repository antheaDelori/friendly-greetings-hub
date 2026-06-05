import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
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

type ReviewRow = {
  user_display: string | null;
  book_title: string | null;
  text: string;
  rating: number;
  created_at: string;
};

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  return `${Math.floor(hours / 24)}g fa`;
}

type BookResult = { id: string; slug: string; titolo: string; author_name: string };

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
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("books")
        .select("id, slug, titolo, author_name")
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
          <button type="button" onClick={onClear} className="font-mono text-bone/30 hover:text-magenta transition-colors text-sm shrink-0" title="Cambia opera">✕</button>
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
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[9px] text-cyan/50 animate-pulse">◆</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full border border-cyan/30 bg-void shadow-lg">
          {results.map((b) => (
            <button
              key={b.slug}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(b); setQuery(""); setOpen(false); }}
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
  const [rating, setRating] = useState(1);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewsList, setReviewsList] = useState<ReviewRow[] | null>(null);
  const [activeAuthors, setActiveAuthors] = useState<{ name: string; genre: string }[]>([]);

  // undefined = still checking, null = not logged in
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userMeta, setUserMeta] = useState<Record<string, string>>({});

  const loadReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("user_display, book_title, text, rating, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setReviewsList(data);
  };

  useEffect(() => {
    loadReviews();
    supabase
      .from("books")
      .select("author_name, genere")
      .eq("disponibile", true)
      .not("author_name", "is", null)
      .order("letture", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!data) return;
        const seen = new Set<string>();
        const unique = data
          .filter((b: { author_name: string }) => { if (seen.has(b.author_name)) return false; seen.add(b.author_name); return true; })
          .slice(0, 5)
          .map((b: { author_name: string; genere: string }) => ({ name: b.author_name, genre: b.genere }));
        setActiveAuthors(unique);
      });
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) { setUserId(null); setIsRegistered(false); return; }
      setUserId(user.id);
      setIsRegistered(!user.is_anonymous);
      setUserMeta((user.user_metadata ?? {}) as Record<string, string>);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const user = session?.user;
      if (!user) { setUserId(null); setIsRegistered(false); return; }
      setUserId(user.id);
      setIsRegistered(!user.is_anonymous);
      setUserMeta((user.user_metadata ?? {}) as Record<string, string>);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePublish = async () => {
    if (!selectedBook || !reviewText.trim() || rating === 0 || !userId) return;
    setSubmitting(true);
    setSubmitError(null);

    // Moderazione testo
    let isFlagged = false;
    const { data: { session } } = await supabase.auth.getSession();
    const modRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: "analyze", text: reviewText.trim() }),
    }).catch(() => null);
    if (modRes?.ok) {
      const mod = await modRes.json();
      if (mod.blocked) {
        setSubmitError("Il tuo commento contiene contenuto inappropriato e non può essere pubblicato.");
        setSubmitting(false);
        return;
      }
      isFlagged = mod.flagged ?? false;
    }

    const displayName = userMeta.pseudonimo
      || `${userMeta.nome ?? ""} ${userMeta.cognome ?? ""}`.trim()
      || "Lettore";

    const { error } = await supabase.from("recensioni").insert({
      user_id: userId,
      book_id: selectedBook.id,
      nome_display: displayName,
      stelle: rating,
      testo: reviewText.trim(),
      flagged: isFlagged,
      flag_reason: isFlagged ? "auto-moderazione" : null,
      source: "community",
    });

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(true);
      setSelectedBook(null);
      setReviewText("");
      setRating(0);
      loadReviews();
    }
  };

  const canPublish = isRegistered && !!selectedBook && reviewText.trim().length > 0 && rating > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/COMMUNITY" title="Community" subtitle="Niente like sterili. Solo persone che leggono e dicono cosa pensano.">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Feed */}
          <div className="space-y-4">
            <HudPanel label="ultime_recensioni" tone="cyan">
              <div className="space-y-5">
                {reviewsList === null ? (
                  <p className="font-mono text-[10px] text-cyan/50 animate-pulse tracking-widest uppercase">▸ caricamento...</p>
                ) : reviewsList.length > 0 ? (
                  reviewsList.map((r, i) => (
                    <div key={i} className="border-l-2 border-cyan/40 pl-4 hover:border-magenta transition-colors">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <div>
                          <span className="font-mono text-cyan text-sm">@{r.user_display ?? "lettore"}</span>
                          <span className="font-mono text-[10px] tracking-widest text-bone/40 uppercase ml-3">▸ {r.book_title ?? "—"}</span>
                        </div>
                        <div className="font-mono text-[10px] tracking-widest text-bone/40">
                          {relativeTime(r.created_at)} · {"★".repeat(r.rating)}
                        </div>
                      </div>
                      <p className="mt-2 font-serif italic text-bone/85 leading-relaxed">"{r.text}"</p>
                    </div>
                  ))
                ) : (
                  <p className="font-serif italic text-bone/40">Nessuna recensione ancora. Sii il primo.</p>
                )}
              </div>
            </HudPanel>

            <HudPanel label="aggiungi_recensione" tone="magenta">
              <h3 className="font-display text-xl text-bone tracking-tight">Lascia la tua</h3>

              {/* Successo */}
              {submitSuccess && (
                <div className="mt-4 border border-cyan/40 bg-cyan/5 px-4 py-4">
                  <p className="font-mono text-[11px] text-cyan tracking-widest uppercase">✓ Recensione pubblicata</p>
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="mt-2 font-mono text-[10px] text-bone/50 hover:text-cyan transition-colors tracking-widest uppercase"
                  >▸ scrivi un'altra</button>
                </div>
              )}

              {/* Non registrato */}
              {!submitSuccess && userId !== undefined && !isRegistered && (
                <div className="mt-4 border border-cyan/20 bg-cyan/5 px-4 py-5 space-y-3">
                  <p className="font-serif italic text-bone/70">
                    Per lasciare una recensione devi avere un account registrato.
                  </p>
                  <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">
                    Gli ospiti possono leggere ma non scrivere.
                  </p>
                  <Link to="/auth">
                    <HudButton variant="primary" className="mt-1">▸ Registrati o accedi</HudButton>
                  </Link>
                </div>
              )}

              {/* Form per utenti registrati */}
              {!submitSuccess && isRegistered && (
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
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex gap-1 items-center">
                      <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase mr-2">↳ voto</span>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          className={`font-display text-2xl transition-colors ${s <= (hoverRating || rating) ? "text-amber" : "text-amber/25"}`}
                        >★</button>
                      ))}
                    </div>
                    <HudButton variant="magenta" disabled={!canPublish || submitting} onClick={handlePublish}>
                      {submitting ? "◆ Pubblicazione..." : "◆ Pubblica"}
                    </HudButton>
                  </div>
                  {submitError && (
                    <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-3 py-2">
                      ⚠ {submitError}
                    </p>
                  )}
                </div>
              )}

              {/* Caricamento stato auth */}
              {!submitSuccess && userId === undefined && (
                <p className="mt-4 font-mono text-[10px] text-cyan/50 animate-pulse tracking-widest uppercase">▸ verifica accesso...</p>
              )}
            </HudPanel>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <HudPanel label="autori_attivi" code="LIVE" tone="amber">
              {activeAuthors.length === 0 ? (
                <p className="font-mono text-[10px] text-bone/40 tracking-widest uppercase">nessun autore ancora</p>
              ) : (
                <ul className="space-y-3">
                  {activeAuthors.map((a) => (
                    <li key={a.name} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan/40 to-magenta/30 ring-1 ring-cyan/40 flex items-center justify-center font-display text-bone">
                        {a.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm text-bone truncate">{a.name}</div>
                        <div className="font-mono text-[9px] tracking-widest text-bone/50 uppercase">▸ {a.genre}</div>
                      </div>
                      <button className="font-mono text-[10px] tracking-widest text-cyan border border-cyan/40 px-2 py-1 hover:bg-cyan hover:text-void transition-all uppercase">
                        +seg
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </HudPanel>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
