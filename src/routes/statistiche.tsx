import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const BRAND_LOGO_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;

type BookStat = {
  id: string;
  titolo: string;
  slug: string;
  copertina_url: string | null;
  genere: string;
  letture: number;
  downloads: number;
  numRecensioni: number;
  avgStelle: number;
  numLikes: number;
  numLibreria: number;
  numFollowers: number;
  numCapitoli: number;
  isOpen: boolean;
};

type RecentRecensione = {
  id: string;
  bookTitolo: string;
  nome_display: string | null;
  stelle: number;
  testo: string | null;
  created_at: string;
};

export const Route = createFileRoute("/statistiche")({
  head: () => ({
    meta: [
      { title: "Statistiche — Liberiamo la mente" },
      { name: "description", content: "Le tue statistiche di lettura su Liberiamo la mente." },
    ],
  }),
  component: StatistichePage,
});

function Star({ filled }: { filled: boolean }) {
  return <span className={`text-xs ${filled ? "text-amber" : "text-bone/20"}`}>{filled ? "★" : "☆"}</span>;
}

const GENERE_LABELS: Record<string, string> = {
  libro: "Libri", racconto: "Racconti", saggio: "Saggi", articolo: "Articoli",
  novelle: "Novelle", poesia: "Poesie", fumetto: "Fumetti",
};

function StatistichePage() {
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [bookStats, setBookStats] = useState<BookStat[]>([]);
  const [recentRecensioni, setRecentRecensioni] = useState<RecentRecensione[]>([]);
  const [totali, setTotali] = useState({ letture: 0, downloads: 0, recensioni: 0, avgStelle: 0, likes: 0, followers: 0 });
  const [filtroGenere, setFiltroGenere] = useState<string | null>(null);
  const [stelleDistrib, setStelleDistrib] = useState<{ stelle: number; count: number }[]>([]);
  const [dashOpen, setDashOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) { window.location.replace("/auth"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("pseudonimo, nome, cognome")
        .eq("id", user.id)
        .single();
      setAuthorName(
        profileData?.pseudonimo ||
        [profileData?.nome, profileData?.cognome].filter(Boolean).join(" ") ||
        "Autore"
      );

      const { data: books } = await supabase
        .from("books")
        .select("id, titolo, slug, copertina_url, genere, letture, downloads, status, disponibile")
        .eq("author_id", user.id)
        .order("letture", { ascending: false });

      if (!books || books.length === 0) { setLoading(false); return; }

      const bookIds = books.map(b => b.id);

      const [recRes, likeRes, libRes, recentRecRes, followersRes, capitoliRes] = await Promise.all([
        supabase.from("recensioni").select("book_id, stelle").in("book_id", bookIds).eq("blocked", false),
        supabase.from("likes").select("book_id").in("book_id", bookIds),
        supabase.from("libreria").select("book_id").in("book_id", bookIds),
        supabase.from("recensioni")
          .select("id, book_id, nome_display, stelle, testo, created_at")
          .in("book_id", bookIds)
          .not("testo", "is", null)
          .eq("blocked", false)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("open_book_subscriptions").select("book_id").in("book_id", bookIds),
        supabase.from("capitoli").select("book_id").in("book_id", bookIds),
      ]);

      const bookTitleMap = Object.fromEntries(books.map(b => [b.id, b.titolo]));
      const stats: BookStat[] = books.map(b => {
        const recs = (recRes.data ?? []).filter(r => r.book_id === b.id);
        const avg = recs.length > 0 ? recs.reduce((s: number, r: { stelle: number }) => s + r.stelle, 0) / recs.length : 0;
        return {
          id: b.id,
          titolo: b.titolo,
          slug: b.slug,
          copertina_url: b.copertina_url,
          genere: b.genere ?? "altro",
          letture: b.letture ?? 0,
          downloads: b.downloads ?? 0,
          numRecensioni: recs.length,
          avgStelle: avg,
          numLikes: (likeRes.data ?? []).filter((l: { book_id: string }) => l.book_id === b.id).length,
          numLibreria: (libRes.data ?? []).filter((l: { book_id: string }) => l.book_id === b.id).length,
          numFollowers: (followersRes.data ?? []).filter((f: { book_id: string }) => f.book_id === b.id).length,
          numCapitoli: (capitoliRes.data ?? []).filter((c: { book_id: string }) => c.book_id === b.id).length,
          isOpen: b.status === "open",
        };
      });

      setBookStats(stats);
      const generiPresenti = [...new Set(stats.map(b => b.genere))];
      setFiltroGenere(generiPresenti.includes("libro") ? "libro" : (generiPresenti[0] ?? null));

      const distrib = [1, 2, 3, 4, 5].map(s => ({
        stelle: s,
        count: (recRes.data ?? []).filter((r: { stelle: number }) => r.stelle === s).length,
      }));
      setStelleDistrib(distrib);
      setRecentRecensioni((recentRecRes.data ?? []).map((r: { id: string; book_id: string; nome_display: string | null; stelle: number; testo: string | null; created_at: string }) => ({
        ...r, bookTitolo: bookTitleMap[r.book_id] ?? "Opera",
      })));

      const allRecs = recRes.data ?? [];
      const totalLetture = stats.reduce((s, b) => s + b.letture, 0);
      const totalDownloads = stats.reduce((s, b) => s + b.downloads, 0);
      const totalLikes = stats.reduce((s, b) => s + b.numLikes, 0);
      const totalFollowers = stats.reduce((s, b) => s + b.numFollowers, 0);
      const globalAvg = allRecs.length > 0
        ? allRecs.reduce((s: number, r: { stelle: number }) => s + r.stelle, 0) / allRecs.length
        : 0;

      setTotali({
        letture: totalLetture,
        downloads: totalDownloads,
        recensioni: allRecs.length,
        avgStelle: globalAvg,
        likes: totalLikes,
        followers: totalFollowers,
      });

      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <PageShell code="// MODULE/STATS" title="Statistiche" subtitle="">
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento in corso...</p>
        </PageShell>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">

        {/* ── BRAND HEADER ── */}
        <div className="border-b border-cyan/10 bg-void/60">
          <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <img
              src={BRAND_LOGO_URL}
              alt="Anthea Delori Edizioni"
              className="h-16 w-auto object-contain"
            />
            <div className="text-center sm:text-left">
              <div className="font-mono text-[9px] tracking-[0.35em] text-cyan/50 uppercase mb-1">// statistiche_autore</div>
              <h1 className="font-display text-3xl text-bone tracking-tight">{authorName}</h1>
              <p className="font-serif italic text-bone/40 text-sm mt-0.5">Dati aggiornati in tempo reale</p>
            </div>
            <div className="sm:ml-auto">
              <Link
                to="/area-autore"
                className="font-mono text-[9px] tracking-widest uppercase text-bone/30 hover:text-cyan/70 transition-colors"
              >
                ← Area riservata
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-12 space-y-12">

          {/* ── TOTALI ── */}
          <section>
            <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// riepilogo_globale</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-cyan/10 border border-cyan/15">
              {[
                { label: "Letture", value: totali.letture.toLocaleString("it-IT"), color: "text-bone" },
                { label: "Download", value: totali.downloads.toLocaleString("it-IT"), color: "text-magenta" },
                { label: "Recensioni", value: totali.recensioni, color: "text-bone" },
                { label: "Rating medio", value: totali.avgStelle > 0 ? `★ ${totali.avgStelle.toFixed(1)}` : "—", color: "text-amber" },
                { label: "Like", value: `♥ ${totali.likes}`, color: "text-blood" },
                { label: "Follower", value: totali.followers, color: "text-cyan" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-void px-5 py-5 flex flex-col gap-1">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-bone/35 uppercase">{label}</span>
                  <span className={`font-display text-2xl ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── DASHBOARD GRAFICI ── */}
          {bookStats.length > 0 && (
            <section>
              <button
                onClick={() => setDashOpen(v => !v)}
                className="w-full flex items-center justify-between group mb-4"
              >
                <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase group-hover:text-cyan/80 transition-colors">
                  // dashboard_visuale
                </div>
                <span className="font-mono text-[9px] tracking-widest text-bone/30 group-hover:text-bone/60 transition-colors uppercase">
                  {dashOpen ? "▲ chiudi" : "▼ apri"}
                </span>
              </button>

              {dashOpen && (() => {
                const COLORS = ["#00d2ff", "#e040fb", "#ff4d6d", "#ffc400", "#69ff94", "#ff9800", "#b388ff"];

                // dati per genere donut
                const genereData = Object.entries(
                  bookStats.reduce<Record<string, number>>((acc, b) => {
                    acc[GENERE_LABELS[b.genere] ?? b.genere] = (acc[GENERE_LABELS[b.genere] ?? b.genere] ?? 0) + 1;
                    return acc;
                  }, {})
                ).map(([name, value]) => ({ name, value }));

                // top 8 per letture
                const lettureData = [...bookStats]
                  .sort((a, b) => b.letture - a.letture)
                  .slice(0, 8)
                  .map(b => ({ name: b.titolo.length > 20 ? b.titolo.slice(0, 18) + "…" : b.titolo, letture: b.letture }));

                // engagement per opera (top 6)
                const engagementData = [...bookStats]
                  .sort((a, b) => b.letture - a.letture)
                  .slice(0, 6)
                  .map(b => ({
                    name: b.titolo.length > 16 ? b.titolo.slice(0, 14) + "…" : b.titolo,
                    Like: b.numLikes,
                    Libreria: b.numLibreria,
                    Recensioni: b.numRecensioni,
                  }));

                const tooltipStyle = {
                  backgroundColor: "#0a0a0f",
                  border: "1px solid rgba(0,210,255,0.2)",
                  borderRadius: 0,
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#f0ebe0",
                };

                return (
                  <div className="grid lg:grid-cols-2 gap-6">

                    {/* Letture per opera */}
                    <HudPanel label="letture per opera" tone="cyan">
                      {lettureData.length === 0
                        ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato disponibile.</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={lettureData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                              <XAxis type="number" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="name" width={110} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                              <Bar dataKey="letture" fill="#00d2ff" radius={[0, 2, 2, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                      }
                    </HudPanel>

                    {/* Distribuzione generi */}
                    <HudPanel label="distribuzione generi" tone="magenta">
                      {genereData.length === 0
                        ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato disponibile.</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie
                                data={genereData}
                                cx="50%" cy="50%"
                                innerRadius={55} outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {genereData.map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={tooltipStyle} />
                              <Legend
                                iconType="square"
                                iconSize={8}
                                wrapperStyle={{ fontFamily: "monospace", fontSize: 10, color: "rgba(240,235,224,0.5)" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                      }
                    </HudPanel>

                    {/* Download per opera */}
                    {(() => {
                      const downloadData = [...bookStats]
                        .sort((a, b) => b.downloads - a.downloads)
                        .slice(0, 8)
                        .map(b => ({ name: b.titolo.length > 20 ? b.titolo.slice(0, 18) + "…" : b.titolo, download: b.downloads }));
                      return (
                        <HudPanel label="download per opera" tone="cyan">
                          {downloadData.every(d => d.download === 0)
                            ? <p className="font-serif italic text-bone/40 text-sm">Nessun download ancora.</p>
                            : <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={downloadData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                                  <XAxis type="number" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} formatter={(v: number) => [v, "Download"]} />
                                  <Bar dataKey="download" fill="#e040fb" radius={[0, 2, 2, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                          }
                        </HudPanel>
                      );
                    })()}

                    {/* Like e Follower per opera */}
                    {(() => {
                      const likeFollowerData = [...bookStats]
                        .sort((a, b) => b.letture - a.letture)
                        .slice(0, 6)
                        .map(b => ({
                          name: b.titolo.length > 16 ? b.titolo.slice(0, 14) + "…" : b.titolo,
                          Like: b.numLikes,
                          Follower: b.numFollowers,
                        }));
                      return (
                        <HudPanel label="like e follower per opera" tone="magenta">
                          {likeFollowerData.every(d => d.Like === 0 && d.Follower === 0)
                            ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato ancora.</p>
                            : <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={likeFollowerData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                                  <XAxis dataKey="name" tick={{ fill: "rgba(240,235,224,0.4)", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                                  <Bar dataKey="Like" fill="#ff4d6d" radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="Follower" fill="#00d2ff" radius={[2, 2, 0, 0]} />
                                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, color: "rgba(240,235,224,0.5)" }} />
                                </BarChart>
                              </ResponsiveContainer>
                          }
                        </HudPanel>
                      );
                    })()}

                    {/* Engagement per opera */}
                    {(() => {
                      const engagementData = [...bookStats]
                        .sort((a, b) => b.letture - a.letture)
                        .slice(0, 6)
                        .map(b => ({
                          name: b.titolo.length > 16 ? b.titolo.slice(0, 14) + "…" : b.titolo,
                          Like: b.numLikes,
                          Libreria: b.numLibreria,
                          Recensioni: b.numRecensioni,
                        }));
                      return (
                        <HudPanel label="engagement per opera" tone="cyan">
                          {engagementData.every(d => d.Like === 0 && d.Libreria === 0 && d.Recensioni === 0)
                            ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato ancora.</p>
                            : <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={engagementData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                                  <XAxis dataKey="name" tick={{ fill: "rgba(240,235,224,0.4)", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                                  <Bar dataKey="Like" fill="#ff4d6d" radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="Libreria" fill="#00d2ff" radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="Recensioni" fill="#e040fb" radius={[2, 2, 0, 0]} />
                                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, color: "rgba(240,235,224,0.5)" }} />
                                </BarChart>
                              </ResponsiveContainer>
                          }
                        </HudPanel>
                      );
                    })()}

                    {/* Distribuzione stelle */}
                    <HudPanel label="distribuzione recensioni" tone="magenta">
                      {stelleDistrib.every(s => s.count === 0)
                        ? <p className="font-serif italic text-bone/40 text-sm">Nessuna recensione ancora.</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={stelleDistrib} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                              <XAxis dataKey="stelle" tickFormatter={(v) => "★".repeat(v)} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} formatter={(v: number) => [v, "Recensioni"]} labelFormatter={(v) => `${"★".repeat(Number(v))} (${v} stelle)`} />
                              <Bar dataKey="count" fill="#ffc400" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                      }
                    </HudPanel>

                  </div>
                );
              })()}
            </section>
          )}

          {/* ── PER OPERA ── */}
          {bookStats.length > 0 && (
            <section>
              <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// dettaglio_opere</div>

              {/* Filtro generi */}
              {(() => {
                const generiPresenti = [...new Set(bookStats.map(b => b.genere))];
                if (generiPresenti.length <= 1) return null;
                return (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {generiPresenti.map(g => (
                      <button
                        key={g}
                        onClick={() => setFiltroGenere(filtroGenere === g ? null : g)}
                        className={`font-mono text-[9px] uppercase tracking-widest border px-4 py-2 transition-all ${
                          filtroGenere === g
                            ? "border-cyan bg-cyan/15 text-cyan"
                            : "border-cyan/20 text-bone/40 hover:border-cyan/50 hover:text-bone/70"
                        }`}
                      >
                        {GENERE_LABELS[g] ?? g}
                        <span className="ml-1.5 opacity-50">{bookStats.filter(b => b.genere === g).length}</span>
                      </button>
                    ))}
                    {filtroGenere && (
                      <button
                        onClick={() => setFiltroGenere(null)}
                        className="font-mono text-[9px] uppercase tracking-widest text-bone/30 hover:text-bone/60 transition-colors px-2"
                      >
                        ✕ tutti
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-3">
                {(filtroGenere ? bookStats.filter(b => b.genere === filtroGenere) : bookStats).map(b => (
                  <div key={b.id} className="glass border border-cyan/15 hover:border-cyan/30 transition-all p-4 sm:p-5">
                    <div className="flex gap-4">

                      {/* Copertina */}
                      <div className="w-12 flex-shrink-0 aspect-[3/4] overflow-hidden bg-deep/60">
                        {b.copertina_url
                          ? <img src={b.copertina_url} alt={b.titolo} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-cyan/20">◆</div>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <Link
                              to={b.isOpen ? "/libri-aperti/$slug" : "/leggi/$slug"}
                              params={{ slug: b.slug }}
                              className="font-display text-bone hover:text-cyan transition-colors leading-snug"
                            >
                              {b.titolo}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[9px] tracking-widest text-bone/30 uppercase">{b.genere}</span>
                              {b.isOpen && (
                                <span className="font-mono text-[8px] tracking-widest uppercase border border-cyan/40 text-cyan/60 px-1.5 py-0.5">
                                  in scrittura
                                </span>
                              )}
                            </div>
                          </div>
                          {b.avgStelle > 0 && (
                            <div className="flex gap-0.5 flex-shrink-0">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} filled={i < Math.round(b.avgStelle)} />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Metriche */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                          {[
                            { label: "Letture", val: b.letture.toLocaleString("it-IT"), color: "text-bone" },
                            { label: "Download", val: String(b.downloads), color: "text-magenta" },
                            { label: "Recensioni", val: String(b.numRecensioni), color: "text-bone/70" },
                            { label: "Like", val: `♥ ${b.numLikes}`, color: "text-blood" },
                            { label: "Libreria", val: String(b.numLibreria), color: "text-bone/70" },
                            b.isOpen
                              ? { label: "Follower", val: String(b.numFollowers), color: "text-cyan" }
                              : { label: "Capitoli", val: String(b.numCapitoli), color: "text-bone/50" },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="border border-cyan/10 px-3 py-2 text-center">
                              <div className="font-mono text-[8px] tracking-widest text-bone/30 uppercase mb-0.5">{label}</div>
                              <div className={`font-display text-sm ${color}`}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── ULTIME RECENSIONI ── */}
          {recentRecensioni.length > 0 && (
            <section>
              <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// ultime_recensioni</div>
              <HudPanel label="cosa dicono i lettori" tone="cyan">
                <div className="space-y-4">
                  {recentRecensioni.map(r => (
                    <div key={r.id} className="border-b border-cyan/10 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4 mb-1.5">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} filled={i < r.stelle} />
                            ))}
                          </div>
                          <span className="font-mono text-[9px] tracking-widest text-bone/40">{r.nome_display ?? "Lettore"}</span>
                          <span className="font-mono text-[9px] tracking-widest text-cyan/40 uppercase">— {r.bookTitolo}</span>
                        </div>
                        <span className="font-mono text-[9px] text-bone/30 flex-shrink-0">
                          {new Date(r.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {r.testo && (
                        <p className="font-serif italic text-sm text-bone/55 leading-relaxed line-clamp-2">
                          "{r.testo}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-cyan/10">
                  <Link to="/area-autore" className="font-mono text-[9px] tracking-widest uppercase text-cyan/50 hover:text-cyan/80 transition-colors">
                    ▸ Rispondi alle recensioni nell'area riservata
                  </Link>
                </div>
              </HudPanel>
            </section>
          )}

          {bookStats.length === 0 && (
            <div className="text-center py-16">
              <p className="font-serif italic text-bone/40 text-lg">Nessuna opera pubblicata ancora.</p>
              <Link to="/gestione" className="mt-6 inline-block font-mono text-[10px] tracking-widest uppercase border border-cyan/40 text-cyan/70 px-6 py-3 hover:bg-cyan/10 transition-colors">
                ▸ Pubblica la tua prima opera
              </Link>
            </div>
          )}

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
