import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";
import { generateBookPdf } from "@/lib/generateBookPdf";

type Profile = {
  nome: string | null;
  cognome: string | null;
  pseudonimo: string | null;
  is_blocked: boolean;
  block_reason: string | null;
  created_at: string;
};

type AuthorProfile = {
  bio: string | null;
  generi: string[];
};

type BookStats = {
  count: number;
  letture: number;
  downloads: number;
  perGenere: Record<string, number>;
};

type AccessLog = {
  id: string;
  event: string;
  status: string;
  created_at: string;
};

type BookEngagement = {
  id: string;
  titolo: string;
  copertina_url: string | null;
  slug: string;
  letture: number;
  avgStelle: number;
  numRecensioni: number;
  numLikes: number;
  numLibreria: number;
};

type RecentRecensione = {
  book_id: string;
  bookTitolo: string;
  nome_display: string | null;
  stelle: number;
  testo: string | null;
  created_at: string;
};

export const Route = createFileRoute("/area-autore")({
  head: () => ({
    meta: [
      { title: "Area riservata — Liberiamo la mente" },
      { name: "description", content: "Dashboard autore: opere, profilo, accessi." },
    ],
  }),
  component: AreaAutorePage,
});

function AreaAutorePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [bookStats, setBookStats] = useState<BookStats>({ count: 0, letture: 0, downloads: 0, perGenere: {} });
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [bookEngagement, setBookEngagement] = useState<BookEngagement[]>([]);
  const [recentRecensioni, setRecentRecensioni] = useState<RecentRecensione[]>([]);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) { window.location.replace("/auth"); return; }

      setEmail(user.email ?? null);
      const uid = user.id;

      const [profileRes, authorRes, booksRes, logsRes, booksFullRes] = await Promise.all([
        supabase.from("profiles").select("nome, cognome, pseudonimo, is_blocked, block_reason, created_at").eq("id", uid).single(),
        supabase.from("author_profiles").select("bio, generi").eq("id", uid).maybeSingle(),
        supabase.from("books").select("letture, downloads, genere").eq("author_id", uid),
        supabase.from("access_logs").select("id, event, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
        supabase.from("books").select("id, titolo, copertina_url, slug, letture").eq("author_id", uid).eq("disponibile", true).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (authorRes.data) setAuthorProfile(authorRes.data);

      if (booksRes.data) {
        const perGenere: Record<string, number> = {};
        for (const b of booksRes.data) {
          const g = b.genere ?? "altro";
          perGenere[g] = (perGenere[g] ?? 0) + 1;
        }
        setBookStats({
          count: booksRes.data.length,
          letture: booksRes.data.reduce((s, b) => s + (b.letture ?? 0), 0),
          downloads: booksRes.data.reduce((s, b) => s + (b.downloads ?? 0), 0),
          perGenere,
        });
      }

      if (logsRes.data) setLogs(logsRes.data);

      // — Engagement: recensioni, like, libreria per ogni libro
      const booksFull = booksFullRes.data ?? [];
      const bookIds = booksFull.map(b => b.id);
      if (bookIds.length > 0) {
        const slugMap = Object.fromEntries(booksFull.map(b => [b.slug, b.id]));
        const slugs = booksFull.map(b => b.slug);
        const [recRes, likeRes, libRes, recentRecRes, revRes, recentRevRes] = await Promise.all([
          supabase.from("recensioni").select("book_id, stelle").in("book_id", bookIds),
          supabase.from("likes").select("book_id").in("book_id", bookIds),
          supabase.from("libreria").select("book_id").in("book_id", bookIds),
          supabase.from("recensioni")
            .select("book_id, nome_display, stelle, testo, created_at")
            .in("book_id", bookIds)
            .not("testo", "is", null)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.from("reviews").select("book_slug, rating").in("book_slug", slugs).eq("flagged", false).eq("blocked", false),
          supabase.from("reviews")
            .select("book_slug, user_display, rating, text, created_at")
            .in("book_slug", slugs)
            .not("text", "is", null)
            .eq("flagged", false).eq("blocked", false)
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
        const bookTitleMap = Object.fromEntries(booksFull.map(b => [b.id, b.titolo]));
        const engagement: BookEngagement[] = booksFull.map(b => {
          const bookRec = (recRes.data ?? []).filter(r => r.book_id === b.id);
          const bookRev = (revRes.data ?? []).filter((r: { book_slug: string }) => r.book_slug === b.slug);
          const allRatings = [
            ...bookRec.map((r: { stelle: number }) => r.stelle),
            ...bookRev.map((r: { rating: number }) => r.rating),
          ];
          const avg = allRatings.length > 0
            ? allRatings.reduce((s, v) => s + v, 0) / allRatings.length
            : 0;
          return {
            id: b.id, titolo: b.titolo, copertina_url: b.copertina_url, slug: b.slug,
            letture: b.letture ?? 0, avgStelle: avg, numRecensioni: bookRec.length + bookRev.length,
            numLikes: (likeRes.data ?? []).filter((l: { book_id: string }) => l.book_id === b.id).length,
            numLibreria: (libRes.data ?? []).filter((l: { book_id: string }) => l.book_id === b.id).length,
          };
        });
        setBookEngagement(engagement);
        const fromRecensioni = (recentRecRes.data ?? []).map((r: { book_id: string; nome_display: string | null; stelle: number; testo: string | null; created_at: string }) => ({
          book_id: r.book_id, nome_display: r.nome_display, stelle: r.stelle,
          testo: r.testo, created_at: r.created_at, bookTitolo: bookTitleMap[r.book_id] ?? "Opera",
        }));
        const fromReviews = (recentRevRes.data ?? []).map((r: { book_slug: string; user_display: string | null; rating: number; text: string | null; created_at: string }) => ({
          book_id: slugMap[r.book_slug] ?? "", nome_display: r.user_display, stelle: r.rating,
          testo: r.text, created_at: r.created_at, bookTitolo: bookTitleMap[slugMap[r.book_slug]] ?? "Opera",
        }));
        setRecentRecensioni(
          [...fromRecensioni, ...fromReviews]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8)
        );
      }

      setLoading(false);
    };
    init();
  }, []);

  const displayName = profile?.pseudonimo || profile?.nome || email?.split("@")[0] || "autore";
  const fullName = [profile?.nome, profile?.cognome].filter(Boolean).join(" ");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <PageShell code="// MODULE/AUTHOR_DASH" title="Area riservata" subtitle="">
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento in corso...</p>
        </PageShell>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// MODULE/AUTHOR_DASH"
        title="Area riservata"
        subtitle="Centro di controllo del tuo canale. Opere, profilo e accessi in un colpo d'occhio."
      >
        {/* Intestazione autore */}
        <div className="glass hud-frame p-6 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative w-20 h-20 hud-frame flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/30 to-magenta/20" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-3xl text-bone/60">◊</div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-mono text-[10px] tracking-[0.3em] text-cyan/70 uppercase">// terminale_autore</div>
            <h2 className="mt-1 font-display text-3xl text-bone tracking-tight">
              {displayName.toUpperCase()}
            </h2>
            {fullName && <p className="mt-1 font-serif italic text-bone/60">{fullName}</p>}
            <p className="mt-1 font-mono text-[10px] tracking-widest text-bone/40">{email}</p>
            {profile?.created_at && (
              <p className="mt-1 font-mono text-[10px] tracking-widest text-bone/30 uppercase">
                iscritto dal {new Date(profile.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            {profile?.is_blocked ? (
              <span className="font-mono text-[10px] uppercase tracking-widest border border-magenta/60 bg-magenta/10 text-magenta px-3 py-2">
                ⚠ Account bloccato
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-widest border border-cyan/40 bg-cyan/5 text-cyan/70 px-3 py-2">
                ✓ Account attivo
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Opere */}
          <HudPanel label="le mie opere" code={`${bookStats.count} pub`} tone="cyan">
            <div className="space-y-4">
              {bookStats.count === 0 ? (
                <p className="font-serif italic text-bone/50 text-sm">Nessuna opera pubblicata ancora.</p>
              ) : (
                <>
                  {/* Suddivisione per genere */}
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { g: "libro", label: "Libri" },
                      { g: "racconto", label: "Racconti" },
                      { g: "saggio", label: "Saggi" },
                      { g: "articolo", label: "Articoli" },
                      { g: "novelle", label: "Novelle" },
                      { g: "poesia", label: "Poesie" },
                    ] as { g: string; label: string; tooltip?: string }[]).map(({ g, label, tooltip }) => {
                      const n = bookStats.perGenere[g] ?? 0;
                      return (
                        <div key={g} className={`relative group text-center border py-2 ${n > 0 ? "border-cyan/25" : "border-cyan/12"}`}>
                          <div className={`font-display text-xl ${n > 0 ? "text-cyan" : "text-cyan/25"}`}>{n}</div>
                          <div className={`font-mono text-[9px] tracking-widest uppercase mt-0.5 ${n > 0 ? "text-bone/40" : "text-bone/25"}`}>{label}</div>
                          {tooltip && (
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap border border-cyan/40 bg-void px-2 py-1 font-mono text-[8px] tracking-widest text-cyan opacity-0 transition-opacity group-hover:opacity-100 z-10">
                              {tooltip}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Letture e Download */}
                  <div className="hud-divider" />
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "letture", value: bookStats.letture, color: "text-bone" },
                      { label: "download", value: bookStats.downloads, color: "text-magenta" },
                    ].map(k => (
                      <div key={k.label} className="text-center border border-cyan/15 py-3">
                        <div className={`font-display text-2xl ${k.color}`}>{k.value}</div>
                        <div className="font-mono text-[9px] tracking-widest text-bone/40 uppercase mt-1">{k.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="hud-divider my-5" />
            <Link to="/gestione">
              <HudButton variant="primary" className="w-full">▸ Gestisci opere</HudButton>
            </Link>
          </HudPanel>

          {/* Profilo autore */}
          <HudPanel label="profilo autore" tone="magenta">
            {authorProfile ? (
              <div className="space-y-4">
                {authorProfile.bio ? (
                  <p className="font-serif italic text-bone/70 text-sm leading-relaxed line-clamp-4">
                    {authorProfile.bio}
                  </p>
                ) : (
                  <p className="font-serif italic text-bone/40 text-sm">Nessuna bio inserita.</p>
                )}
                {authorProfile.generi?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {authorProfile.generi.map(g => (
                      <span key={g} className="font-mono text-[9px] uppercase tracking-widest border border-magenta/40 px-2 py-1 text-magenta/70">
                        ◆ {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="font-serif italic text-bone/50 text-sm">Profilo autore non configurato.</p>
            )}
            <div className="hud-divider my-5" />
            <Link to="/auth/profilo-autore">
              <HudButton variant="magenta" className="w-full">◆ Modifica profilo</HudButton>
            </Link>
          </HudPanel>

          {/* Ultimi accessi */}
          <HudPanel label="ultimi accessi" tone="cyan">
            {logs.length === 0 ? (
              <p className="font-serif italic text-bone/40 text-sm">Nessun accesso registrato.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map(log => (
                  <li key={log.id} className="border-b border-cyan/10 pb-2">
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[10px] uppercase tracking-widest ${
                        log.status === "blocked" ? "text-magenta" : "text-cyan/70"
                      }`}>
                        {log.status === "blocked" ? "⚠ bloccato" : "✓ " + log.event}
                      </span>
                    </div>
                    <div className="font-mono text-[9px] text-bone/30 tracking-widest mt-0.5">
                      {formatDate(log.created_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </HudPanel>

        </div>

        {/* ── COSA PENSANO I TUOI LETTORI ── */}
        {bookEngagement.length > 0 && (
          <div className="mt-16">
            <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-2">// engagement</div>
            <h2 className="font-display text-2xl text-bone mb-8">Cosa pensano i tuoi lettori</h2>

            {/* Totali globali */}
            {(() => {
              const totalLikes = bookEngagement.reduce((s, b) => s + b.numLikes, 0);
              const totalRec = bookEngagement.reduce((s, b) => s + b.numRecensioni, 0);
              const allStelle = bookEngagement.filter(b => b.avgStelle > 0);
              const globalAvg = allStelle.length > 0
                ? allStelle.reduce((s, b) => s + b.avgStelle, 0) / allStelle.length
                : 0;
              return (
                <div className="grid grid-cols-3 gap-px bg-cyan/10 border border-cyan/15 mb-8">
                  {[
                    { label: "Rating medio", value: globalAvg > 0 ? `★ ${globalAvg.toFixed(1)}` : "—" },
                    { label: "Recensioni", value: totalRec },
                    { label: "Like totali", value: `♥ ${totalLikes}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-void px-5 py-4 flex flex-col gap-1">
                      <span className="font-mono text-[9px] tracking-[0.25em] text-bone/40 uppercase">{label}</span>
                      <span className="font-display text-xl text-cyan">{value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Card per ogni libro */}
            <div className="space-y-3 mb-12">
              {bookEngagement.map(b => (
                <Link
                  key={b.id}
                  to="/leggi/$slug"
                  params={{ slug: b.slug }}
                  className="group flex gap-4 glass border border-cyan/15 hover:border-cyan/35 p-4 transition-all relative"
                >
                  <span className="absolute top-1.5 left-1.5 w-2 h-2 border-l border-t border-cyan/40" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 border-r border-t border-cyan/40" />
                  <span className="absolute bottom-1.5 left-1.5 w-2 h-2 border-l border-b border-cyan/40" />
                  <span className="absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b border-cyan/40" />

                  {/* Cover */}
                  <div className="w-12 flex-shrink-0 aspect-[3/4] overflow-hidden bg-deep/60">
                    {b.copertina_url
                      ? <img src={b.copertina_url} alt={b.titolo} className="w-full h-full object-cover saturate-50 group-hover:saturate-100 transition-all duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-cyan/20 text-lg">◆</div>
                    }
                  </div>

                  {/* Dati */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-bone group-hover:text-cyan transition-colors leading-snug mb-2 truncate">
                      {b.titolo}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                      {[
                        { label: "Letture", val: b.letture.toLocaleString("it-IT"), color: "text-bone/70" },
                        { label: "Rating", val: b.avgStelle > 0 ? `★ ${b.avgStelle.toFixed(1)}` : "—", color: "text-amber" },
                        { label: "Recens.", val: String(b.numRecensioni), color: "text-bone/70" },
                        { label: "Like", val: `♥ ${b.numLikes}`, color: "text-blood" },
                        { label: "Libreria", val: String(b.numLibreria), color: "text-cyan/70" },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="flex flex-col gap-0">
                          <span className="font-mono text-[8px] tracking-widest text-bone/30 uppercase">{label}</span>
                          <span className={`font-display text-sm ${color}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Recensioni recenti con testo */}
            {recentRecensioni.length > 0 && (
              <div>
                <div className="font-mono text-[9px] tracking-[0.25em] text-bone/40 uppercase mb-4">— Ultime recensioni</div>
                <div className="space-y-3">
                  {recentRecensioni.map((r, i) => (
                    <div key={i} className="glass border border-cyan/10 p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <span className="font-mono text-[9px] tracking-widest text-cyan/50 uppercase">{r.bookTitolo}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <span key={i} className={`text-xs ${i < r.stelle ? "text-blood" : "text-bone/20"}`}>
                                  {i < r.stelle ? "★" : "☆"}
                                </span>
                              ))}
                            </span>
                            <span className="font-mono text-[9px] text-bone/40">{r.nome_display ?? "Lettore"}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[9px] text-bone/25 flex-shrink-0">
                          {new Date(r.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {r.testo && (
                        <p className="font-serif italic text-sm text-bone/55 leading-relaxed line-clamp-3">
                          "{r.testo}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {/* ─── LE TUE OPERE — Esporta PDF ─────────────────────────────── */}
      {bookEngagement.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12">
          <h2 className="font-display text-2xl text-bone mb-2">Le tue opere</h2>
          <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase mb-8">
            Scarica il PDF A5 pronto per la stampa
          </p>
          <div className="divide-y divide-cyan/10 border border-cyan/15 glass">
            {bookEngagement.map(b => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-4">
                {/* Copertina mini */}
                {b.copertina_url
                  ? <img src={b.copertina_url} alt={b.titolo} className="w-10 h-14 object-cover flex-shrink-0 ring-1 ring-cyan/30" />
                  : <div className="w-10 h-14 flex-shrink-0 bg-void border border-cyan/20 flex items-center justify-center font-display text-bone/20">◊</div>
                }
                {/* Info libro */}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-bone tracking-tight truncate">{b.titolo}</p>
                  <p className="font-mono text-[9px] tracking-widest text-bone/40 uppercase mt-0.5">
                    {b.letture} letture · {b.numRecensioni} rec · ♥ {b.numLikes}
                  </p>
                </div>
                {/* Bottone export */}
                <button
                  disabled={!!pdfLoadingId}
                  onClick={async () => {
                    if (pdfLoadingId) return;
                    setPdfLoadingId(b.id);
                    try {
                      // Carica dati completi del libro + capitoli
                      const [bookRes, chapRes] = await Promise.all([
                        supabase.from("books")
                          .select("slug, titolo, descrizione, genere, anno, copertina_url, author_name")
                          .eq("id", b.id)
                          .maybeSingle(),
                        supabase.from("capitoli")
                          .select("id, ordine, titolo, testo")
                          .eq("book_id", b.id)
                          .order("ordine", { ascending: true }),
                      ]);
                      const bd = bookRes.data;
                      if (!bd) return;
                      const chapters = (chapRes.data ?? []).map((c: { id: string; titolo: string; testo: string }) => ({
                        id: c.id,
                        title: c.titolo ?? `Capitolo`,
                        content: [c.testo ?? ""],
                        isHtml: true,
                      }));
                      const bookObj = {
                        slug: bd.slug,
                        title: bd.titolo,
                        author: bd.author_name ?? profile?.nome ?? "Autore",
                        authorSlug: "",
                        genre: bd.genere as import("@/data/books").Genre,
                        year: bd.anno ?? new Date().getFullYear(),
                        reads: b.letture,
                        rating: b.avgStelle,
                        cover: bd.copertina_url ?? "",
                        tagline: bd.descrizione?.slice(0, 140) ?? "",
                        description: bd.descrizione ?? "",
                        chapters,
                      };
                      await generateBookPdf(bookObj, authorProfile?.bio ?? null);
                    } finally {
                      setPdfLoadingId(null);
                    }
                  }}
                  className="flex-shrink-0 inline-flex items-center gap-2 border border-cyan/40 bg-cyan/5 px-4 py-2 font-mono text-[10px] tracking-widest uppercase text-cyan hover:bg-cyan hover:text-void transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {pdfLoadingId === b.id ? (
                    <><span className="animate-pulse">⏳</span> Genera…</>
                  ) : (
                    <><span>⎙</span> PDF stampa</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      </PageShell>
      <SiteFooter />
    </div>
  );
}
