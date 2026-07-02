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
  novelle: "Novelle", poesia: "Poesie", fumetto: "Fumetti", illustrato: "Illustrati",
};

const ADMIN_EMAIL = "antheadelori@live.it";

const tooltipStyle = {
  backgroundColor: "#0a0a0f",
  border: "1px solid rgba(0,210,255,0.2)",
  borderRadius: 0,
  fontFamily: "monospace",
  fontSize: 11,
  color: "#f0ebe0",
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [trafficoTotale, setTrafficoTotale] = useState(0);
  const [trafficoGiorni, setTrafficoGiorni] = useState<{ giorno: string; visite: number }[]>([]);
  const [trafficoPagine, setTrafficoPagine] = useState<{ path: string; visite: number }[]>([]);
  const [trafficoDevice, setTrafficoDevice] = useState<{ device: string; visite: number }[]>([]);
  const [trafficoPaesi, setTrafficoPaesi] = useState<{ country: string; visite: number }[]>([]);
  const [adminStats, setAdminStats] = useState({ utenti: 0, autori: 0, opere: 0, lettureTotali: 0, downloadTotali: 0, recensioniTotali: 0 });
  const [topOpere, setTopOpere] = useState<{ titolo: string; author_name: string | null; letture: number; downloads: number; slug: string; genere: string }[]>([]);
  const [genereBreakdown, setGenereBreakdown] = useState<{ genere: string; count: number; letture: number }[]>([]);
  const [topAutori, setTopAutori] = useState<{ author_name: string; letture: number; opere: number }[]>([]);

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

      // Traffico sito — solo admin
      const adminUser = user.email?.toLowerCase() === ADMIN_EMAIL;
      setIsAdmin(adminUser);
      if (adminUser) {
        // KPI piattaforma
        const [opereRes, booksAllRes, recTotRes] = await Promise.all([
          supabase.from("books").select("id", { count: "exact", head: true }).eq("disponibile", true).eq("cestinato", false),
          supabase.from("books").select("titolo, author_name, letture, downloads, genere, slug").eq("disponibile", true).eq("cestinato", false),
          supabase.from("recensioni").select("id", { count: "exact", head: true }).eq("blocked", false),
        ]);
        const allBooksPlat = (booksAllRes.data ?? []) as { titolo: string; author_name: string | null; letture: number; downloads: number; genere: string; slug: string }[];
        const lettureTotali = allBooksPlat.reduce((s, b) => s + (b.letture ?? 0), 0);
        const downloadTotali = allBooksPlat.reduce((s, b) => s + (b.downloads ?? 0), 0);
        const autoriUnici = new Set(allBooksPlat.map(b => b.author_name).filter(Boolean)).size;
        setAdminStats({
          utenti: 0,
          autori: autoriUnici,
          opere: opereRes.count ?? 0,
          lettureTotali,
          downloadTotali,
          recensioniTotali: recTotRes.count ?? 0,
        });
        setTopOpere([...allBooksPlat].sort((a, b) => (b.letture ?? 0) - (a.letture ?? 0)).slice(0, 10));
        const genMap: Record<string, { count: number; letture: number }> = {};
        for (const b of allBooksPlat) {
          const g = b.genere ?? "altro";
          if (!genMap[g]) genMap[g] = { count: 0, letture: 0 };
          genMap[g].count++;
          genMap[g].letture += b.letture ?? 0;
        }
        setGenereBreakdown(Object.entries(genMap).map(([genere, d]) => ({ genere, ...d })).sort((a, b) => b.letture - a.letture));
        const authorMap: Record<string, { letture: number; opere: number }> = {};
        for (const b of allBooksPlat) {
          const n = b.author_name ?? "Autore";
          if (!authorMap[n]) authorMap[n] = { letture: 0, opere: 0 };
          authorMap[n].letture += b.letture ?? 0;
          authorMap[n].opere++;
        }
        setTopAutori(Object.entries(authorMap).map(([author_name, d]) => ({ author_name, ...d })).sort((a, b) => b.letture - a.letture).slice(0, 8));

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const [totalRes, recentRes] = await Promise.all([
          supabase.from("page_views").select("id", { count: "exact", head: true }),
          supabase.from("page_views").select("path, device, country, created_at").gte("created_at", sevenDaysAgo.toISOString()),
        ]);
        setTrafficoTotale(totalRes.count ?? 0);
        const rows = recentRes.data ?? [];
        // Ultimi 7 giorni in ordine cronologico
        const last7: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          last7.push(d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }));
        }
        const giorniMap: Record<string, number> = Object.fromEntries(last7.map(d => [d, 0]));
        for (const v of rows) {
          const g = new Date(v.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
          if (giorniMap[g] !== undefined) giorniMap[g]++;
        }
        setTrafficoGiorni(last7.map(g => ({ giorno: g, visite: giorniMap[g] })));
        const pagineMap: Record<string, number> = {};
        for (const v of rows) pagineMap[v.path] = (pagineMap[v.path] ?? 0) + 1;
        setTrafficoPagine(Object.entries(pagineMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, visite]) => ({ path, visite })));
        const deviceMap: Record<string, number> = {};
        for (const v of rows) deviceMap[v.device ?? "unknown"] = (deviceMap[v.device ?? "unknown"] ?? 0) + 1;
        setTrafficoDevice(Object.entries(deviceMap).map(([device, visite]) => ({ device, visite })));
        const paesiMap: Record<string, number> = {};
        for (const v of rows) if (v.country) paesiMap[v.country] = (paesiMap[v.country] ?? 0) + 1;
        setTrafficoPaesi(Object.entries(paesiMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([country, visite]) => ({ country, visite })));
      }

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

          {/* ── ADMIN PIATTAFORMA ── */}
          {isAdmin && (
            <section>
              <div className="font-mono text-[9px] tracking-[0.3em] text-magenta/70 uppercase mb-4">// dashboard_piattaforma</div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-cyan/10 border border-cyan/15 mb-6">
                {[
                  { label: "Autori", value: adminStats.autori.toLocaleString("it-IT"), color: "text-magenta" },
                  { label: "Opere pubblicate", value: adminStats.opere.toLocaleString("it-IT"), color: "text-bone" },
                  { label: "Aperture totali", value: adminStats.lettureTotali.toLocaleString("it-IT"), color: "text-cyan", note: "letture online" },
                  { label: "Download totali", value: adminStats.downloadTotali.toLocaleString("it-IT"), color: "text-magenta" },
                  { label: "Recensioni", value: adminStats.recensioniTotali.toLocaleString("it-IT"), color: "text-bone" },
                ].map(({ label, value, color, note }) => (
                  <div key={label} className="bg-void px-5 py-5 flex flex-col gap-1">
                    <span className="font-mono text-[9px] tracking-[0.25em] text-bone/35 uppercase">{label}</span>
                    <span className={`font-display text-2xl ${color}`}>{value}</span>
                    {note && <span className="font-mono text-[8px] text-bone/20 uppercase">{note}</span>}
                  </div>
                ))}
              </div>

              {/* Top opere per aperture */}
              {topOpere.length > 0 && (
                <div className="mb-6">
                  <div className="font-mono text-[9px] tracking-[0.25em] text-cyan/40 uppercase mb-3">↳ top opere per aperture online</div>
                  <div className="border border-cyan/15">
                    {topOpere.map((b, i) => (
                      <div key={b.slug} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t border-cyan/[0.08]" : ""} hover:bg-cyan/5 transition-colors`}>
                        <span className="font-mono text-[9px] text-bone/20 w-5 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        <div className="flex-1 min-w-0">
                          <Link to="/leggi/$slug" params={{ slug: b.slug }} className="font-serif text-sm text-bone/80 hover:text-cyan transition-colors truncate block">{b.titolo}</Link>
                          <span className="font-mono text-[9px] text-bone/30">{b.author_name ?? "—"} · {GENERE_LABELS[b.genere] ?? b.genere}</span>
                        </div>
                        <div className="flex gap-6 flex-shrink-0 text-right">
                          <div>
                            <div className="font-mono text-[8px] text-bone/25 uppercase">aperture</div>
                            <div className="font-display text-sm text-cyan">{(b.letture ?? 0).toLocaleString("it-IT")}</div>
                          </div>
                          <div>
                            <div className="font-mono text-[8px] text-bone/25 uppercase">download</div>
                            <div className="font-display text-sm text-magenta">{(b.downloads ?? 0).toLocaleString("it-IT")}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generi + Top autori */}
              <div className="grid lg:grid-cols-2 gap-6">
                <HudPanel label="opere e aperture per genere" tone="cyan">
                  {genereBreakdown.length === 0
                    ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato.</p>
                    : <div className="space-y-3">
                        {genereBreakdown.map(g => (
                          <div key={g.genere} className="flex items-center gap-3">
                            <span className="font-mono text-[9px] tracking-widest text-bone/40 uppercase w-20 flex-shrink-0">{GENERE_LABELS[g.genere] ?? g.genere}</span>
                            <div className="flex-1 h-1 bg-cyan/10 relative">
                              <div
                                className="absolute inset-y-0 left-0 bg-cyan/50"
                                style={{ width: `${Math.round((g.letture / Math.max(1, genereBreakdown[0].letture)) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] text-bone/30 w-8 text-right">{g.count}</span>
                            <span className="font-display text-sm text-cyan w-14 text-right">{g.letture.toLocaleString("it-IT")}</span>
                          </div>
                        ))}
                        <div className="font-mono text-[8px] text-bone/20 pt-1">colonne: opere · aperture</div>
                      </div>
                  }
                </HudPanel>
                <HudPanel label="top autori per aperture" tone="magenta">
                  {topAutori.length === 0
                    ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato.</p>
                    : <div className="space-y-3">
                        {topAutori.map((a, i) => (
                          <div key={a.author_name} className="flex items-center gap-3">
                            <span className="font-mono text-[8px] text-bone/20 w-4 flex-shrink-0">{i + 1}</span>
                            <span className="font-serif text-sm text-bone/70 flex-1 truncate">{a.author_name}</span>
                            <span className="font-mono text-[9px] text-bone/25">{a.opere} op.</span>
                            <span className="font-display text-sm text-magenta w-14 text-right">{a.letture.toLocaleString("it-IT")}</span>
                          </div>
                        ))}
                        <div className="font-mono text-[8px] text-bone/20 pt-1">colonne: opere · aperture totali</div>
                      </div>
                  }
                </HudPanel>
              </div>
            </section>
          )}

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

          {/* ── TRAFFICO SITO (solo admin) ── */}
          {isAdmin && (
            <section>
              <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// traffico_sito</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-cyan/10 border border-cyan/15 mb-6">
                {[
                  { label: "Visite totali", value: trafficoTotale.toLocaleString("it-IT"), color: "text-cyan" },
                  { label: "Visite 7gg", value: trafficoGiorni.reduce((s, d) => s + d.visite, 0).toLocaleString("it-IT"), color: "text-bone" },
                  { label: "Pagine uniche", value: trafficoPagine.length || "—", color: "text-magenta" },
                  { label: "Paesi", value: trafficoPaesi.length || "—", color: "text-bone" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-void px-5 py-5 flex flex-col gap-1">
                    <span className="font-mono text-[9px] tracking-[0.25em] text-bone/35 uppercase">{label}</span>
                    <span className={`font-display text-2xl ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <HudPanel label="visite per giorno — ultimi 7gg" tone="cyan">
                  {trafficoGiorni.every(d => d.visite === 0)
                    ? <p className="font-serif italic text-bone/40 text-sm">Nessuna visita ancora registrata.</p>
                    : <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={trafficoGiorni} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                          <XAxis dataKey="giorno" tick={{ fill: "rgba(240,235,224,0.4)", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} formatter={(v: number) => [v, "Visite"]} />
                          <Bar dataKey="visite" fill="#00d2ff" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </HudPanel>
                <HudPanel label="pagine più visitate — 7gg" tone="magenta">
                  {trafficoPagine.length === 0
                    ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato ancora.</p>
                    : <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={trafficoPagine} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                          <XAxis type="number" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="path" width={130} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} formatter={(v: number) => [v, "Visite"]} />
                          <Bar dataKey="visite" fill="#e040fb" radius={[0, 2, 2, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </HudPanel>
                <HudPanel label="dispositivi — 7gg" tone="cyan">
                  {trafficoDevice.length === 0
                    ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato ancora.</p>
                    : <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={trafficoDevice} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="visite" nameKey="device">
                            {trafficoDevice.map((_, i) => (
                              <Cell key={i} fill={["#00d2ff", "#e040fb", "#ffc400"][i % 3]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, color: "rgba(240,235,224,0.5)" }} />
                        </PieChart>
                      </ResponsiveContainer>
                  }
                </HudPanel>
                <HudPanel label="paesi — 7gg" tone="magenta">
                  {trafficoPaesi.length === 0
                    ? <p className="font-serif italic text-bone/40 text-sm">Nessun dato ancora.</p>
                    : <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={trafficoPaesi} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                          <XAxis type="number" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="country" width={120} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} formatter={(v: number) => [v, "Visite"]} />
                          <Bar dataKey="visite" fill="#69ff94" radius={[0, 2, 2, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </HudPanel>
              </div>
            </section>
          )}

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
