import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { HudPanel } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Dashboard admin — Liberiamo la mente" }],
  }),
  component: AdminDashboard,
});

type TimePeriod = "settimana" | "mese" | "anno" | "tutto";

const PERIODS: { key: TimePeriod; label: string }[] = [
  { key: "settimana", label: "7 giorni" },
  { key: "mese", label: "30 giorni" },
  { key: "anno", label: "12 mesi" },
  { key: "tutto", label: "sempre" },
];

const tooltipStyle = {
  backgroundColor: "#0a0a0f",
  border: "1px solid rgba(0,210,255,0.2)",
  borderRadius: 0,
  fontFamily: "monospace",
  fontSize: 11,
};

const GENRE_COLORS = ["#00d2ff", "#e040fb", "#ff4d6d", "#ffc400", "#00ff88", "#ff6b35"];

function groupByPeriod(dates: string[], period: TimePeriod): { label: string; count: number }[] {
  const now = new Date();
  let allLabels: string[];
  let getLabel: (d: Date) => string;
  let startDate: Date;

  if (period === "settimana") {
    getLabel = (d) => d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit" });
    startDate = new Date(now); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0, 0, 0, 0);
    allLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return getLabel(d);
    });
  } else if (period === "mese") {
    getLabel = (d) => d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
    startDate = new Date(now); startDate.setDate(startDate.getDate() - 29); startDate.setHours(0, 0, 0, 0);
    allLabels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (29 - i)); return getLabel(d);
    });
  } else if (period === "anno") {
    getLabel = (d) => d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
    startDate = new Date(now); startDate.setMonth(startDate.getMonth() - 11); startDate.setDate(1); startDate.setHours(0, 0, 0, 0);
    allLabels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now); d.setMonth(d.getMonth() - (11 - i)); d.setDate(1); return getLabel(d);
    });
  } else {
    getLabel = (d) => d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
    if (dates.length === 0) return [];
    const earliest = new Date(dates.reduce((a, b) => (a < b ? a : b)));
    startDate = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    allLabels = [];
    const cur = new Date(startDate);
    while (cur <= now) {
      allLabels.push(getLabel(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  const counts: Record<string, number> = {};
  allLabels.forEach((l) => (counts[l] = 0));
  dates.forEach((dateStr) => {
    const d = new Date(dateStr);
    if (d < startDate) return;
    const label = getLabel(d);
    if (label in counts) counts[label]++;
  });

  return allLabels.map((l) => ({ label: l, count: counts[l] }));
}

type ProfileRow = { id: string; created_at: string; max_opere: number; is_author: boolean };
type BookRow = { id: string; titolo: string; author_name: string | null; genere: string | null; letture: number; downloads: number; disponibile: boolean; created_at: string };
type RecensioneRow = { id: string; stelle: number; created_at: string };
type FollowerRow = { id: string; created_at: string };
type DonazioneRow = { id: string; author_name: string | null; created_at: string };

function AdminDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [period, setPeriod] = useState<TimePeriod>("mese");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [recensioni, setRecensioni] = useState<RecensioneRow[]>([]);
  const [followers, setFollowers] = useState<FollowerRow[]>([]);
  const [donazioni, setDonazioni] = useState<DonazioneRow[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email?.toLowerCase() === ADMIN_EMAIL) {
        setAuthorized(true);
        loadData();
      } else {
        setAuthorized(false);
      }
    });
  }, []);

  async function loadData() {
    const [pRes, bRes, rRes, fRes, dRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, max_opere, is_author"),
      supabase.from("books").select("id, titolo, author_name, genere, letture, downloads, disponibile, created_at"),
      supabase.from("recensioni").select("id, stelle, created_at").eq("blocked", false),
      supabase.from("author_followers").select("id, created_at"),
      supabase.from("donazioni").select("id, author_name, created_at"),
    ]);
    if (pRes.data) setProfiles(pRes.data as ProfileRow[]);
    if (bRes.data) setBooks(bRes.data as BookRow[]);
    if (rRes.data) setRecensioni(rRes.data as RecensioneRow[]);
    if (fRes.data) setFollowers(fRes.data as FollowerRow[]);
    if (dRes.data) setDonazioni(dRes.data as DonazioneRow[]);
  }

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <p className="font-mono text-[10px] tracking-widest text-bone/30 uppercase animate-pulse">▸ caricamento...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <p className="font-mono text-[10px] tracking-widest text-blood/50 uppercase">// accesso negato</p>
      </div>
    );
  }

  const published = books.filter((b) => b.disponibile);
  const autori = profiles.filter((p) => p.is_author);
  const abbonati = profiles.filter((p) => (p.max_opere ?? 1) >= 2);
  const totalLetture = books.reduce((s, b) => s + (b.letture || 0), 0);
  const totalDownloads = books.reduce((s, b) => s + (b.downloads || 0), 0);
  const avgStar = recensioni.length > 0
    ? (recensioni.reduce((s, r) => s + r.stelle, 0) / recensioni.length).toFixed(1)
    : "—";

  const genreMap: Record<string, number> = {};
  published.forEach((b) => { const g = b.genere || "altro"; genreMap[g] = (genreMap[g] || 0) + 1; });
  const genreData = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const topLetture = [...published].sort((a, b) => b.letture - a.letture).slice(0, 5).map((b) => ({
    name: b.titolo.length > 22 ? b.titolo.slice(0, 20) + "…" : b.titolo,
    letture: b.letture,
  }));

  const topDownload = [...published].sort((a, b) => b.downloads - a.downloads).slice(0, 5).map((b) => ({
    name: b.titolo.length > 22 ? b.titolo.slice(0, 20) + "…" : b.titolo,
    download: b.downloads,
  }));

  const stelleMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  recensioni.forEach((r) => { if (r.stelle >= 1 && r.stelle <= 5) stelleMap[r.stelle]++; });
  const stelleData = [1, 2, 3, 4, 5].map((s) => ({ stelle: s, count: stelleMap[s] }));

  const subData = [
    { name: "Abbonati", value: abbonati.length },
    { name: "Autori free", value: Math.max(0, autori.length - abbonati.length) },
    { name: "Lettori", value: Math.max(0, profiles.length - autori.length) },
  ];

  const utentiGrowth = groupByPeriod(profiles.map((p) => p.created_at), period);
  const opereGrowth = groupByPeriod(published.map((b) => b.created_at), period);
  const recensioniGrowth = groupByPeriod(recensioni.map((r) => r.created_at), period);
  const followerGrowth = groupByPeriod(followers.map((f) => f.created_at), period);

  const kpis = [
    { label: "utenti", value: profiles.length, color: "text-cyan" },
    { label: "autori", value: autori.length, color: "text-cyan" },
    { label: "abbonati", value: abbonati.length, color: "text-cyan" },
    { label: "opere pubbl.", value: published.length, color: "text-magenta" },
    { label: "letture", value: totalLetture.toLocaleString("it-IT"), color: "text-magenta" },
    { label: "download", value: totalDownloads.toLocaleString("it-IT"), color: "text-magenta" },
    { label: "recensioni", value: recensioni.length, color: "text-amber" },
    { label: "rating medio", value: avgStar, color: "text-amber" },
    { label: "follower", value: followers.length, color: "text-amber" },
    { label: "donazioni avviate", value: donazioni.length, color: "text-magenta" },
  ];

  return (
    <div className="min-h-screen bg-void text-bone">

      {/* Header */}
      <div className="border-b border-cyan/20 px-8 py-5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[9px] tracking-[0.4em] text-cyan/50 uppercase mb-1">// dashboard admin</div>
          <h1 className="font-display text-2xl text-bone tracking-wide">Liberiamo la mente</h1>
        </div>
        <img
          src={`${SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`}
          alt="Anthea Delori Edizioni"
          className="h-10 opacity-80"
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* KPI globali */}
        <section>
          <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// riepilogo globale</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="border border-cyan/20 bg-void/60 p-4 flex flex-col gap-1">
                <div className={`font-display text-2xl ${k.color}`}>{k.value}</div>
                <div className="font-mono text-[9px] tracking-widest text-bone/35 uppercase leading-tight">{k.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Andamento nel tempo */}
        <section>
          <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-3">// andamento nel tempo</div>
          <div className="flex gap-2 mb-6 flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase border transition-all ${
                  period === p.key
                    ? "border-cyan bg-cyan/15 text-cyan"
                    : "border-bone/20 text-bone/40 hover:border-bone/40 hover:text-bone/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <HudPanel label="nuovi utenti" tone="cyan">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={utentiGrowth} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                  <Bar dataKey="count" name="utenti" fill="#00d2ff" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </HudPanel>

            <HudPanel label="nuove opere" tone="magenta">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={opereGrowth} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                  <Bar dataKey="count" name="opere" fill="#e040fb" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </HudPanel>

            <HudPanel label="nuove recensioni" tone="magenta">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recensioniGrowth} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                  <Bar dataKey="count" name="recensioni" fill="#ff4d6d" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </HudPanel>

            <HudPanel label="nuovi follower" tone="amber">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={followerGrowth} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                  <Bar dataKey="count" name="follower" fill="#ffc400" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </HudPanel>
          </div>
        </section>

        {/* Distribuzione */}
        <section>
          <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// distribuzione</div>
          <div className="grid md:grid-cols-3 gap-4">

            <HudPanel label="opere per genere" tone="cyan">
              {genreData.length === 0
                ? <p className="font-serif italic text-bone/40 text-sm">Nessuna opera.</p>
                : <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={72} paddingAngle={2}>
                        {genreData.map((_, i) => <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, color: "rgba(240,235,224,0.5)" }} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </HudPanel>

            <HudPanel label="utenti per tipo" tone="magenta">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={subData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={72} paddingAngle={2}>
                    <Cell fill="#00d2ff" />
                    <Cell fill="#e040fb" />
                    <Cell fill="rgba(240,235,224,0.12)" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, color: "rgba(240,235,224,0.5)" }} />
                </PieChart>
              </ResponsiveContainer>
            </HudPanel>

            <HudPanel label="distribuzione stelle" tone="amber">
              {recensioni.length === 0
                ? <p className="font-serif italic text-bone/40 text-sm">Nessuna recensione.</p>
                : <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={stelleData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                      <XAxis dataKey="stelle" tickFormatter={(v) => "★".repeat(v)} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} formatter={(v: number) => [v, "Recensioni"]} labelFormatter={(v) => `${"★".repeat(Number(v))} (${v} stelle)`} />
                      <Bar dataKey="count" fill="#ffc400" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </HudPanel>
          </div>
        </section>

        {/* Top contenuti */}
        <section>
          <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// top contenuti</div>
          <div className="grid md:grid-cols-2 gap-4">

            <HudPanel label="top opere — letture" tone="cyan">
              {topLetture.length === 0
                ? <p className="font-serif italic text-bone/40 text-sm">Nessuna opera.</p>
                : <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topLetture} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                      <XAxis type="number" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                      <Bar dataKey="letture" fill="#00d2ff" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </HudPanel>

            <HudPanel label="top opere — download" tone="magenta">
              {topDownload.length === 0
                ? <p className="font-serif italic text-bone/40 text-sm">Nessuna opera.</p>
                : <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topDownload} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                      <XAxis type="number" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: "rgba(240,235,224,0.5)", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,210,255,0.05)" }} />
                      <Bar dataKey="download" fill="#e040fb" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </HudPanel>
          </div>
        </section>

        {/* Donazioni */}
        <section>
          <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-4">// donazioni avviate</div>
          <div className="grid md:grid-cols-2 gap-4">
            <HudPanel label="transazioni avviate" tone="amber">
              <div className="flex items-center gap-6">
                <div className="font-display text-5xl text-amber">{donazioni.length}</div>
                <div>
                  <div className="font-mono text-[10px] tracking-widest text-bone/50 uppercase">transazioni avviate</div>
                  <div className="font-mono text-[9px] tracking-widest text-bone/30 uppercase mt-1">importo non tracciato — pagamento diretto autore</div>
                </div>
              </div>
              {donazioni.length > 0 && (
                <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
                  {[...donazioni].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10).map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-3 border-b border-amber/10 py-1">
                      <span className="font-serif text-sm text-bone/70">{d.author_name ?? "—"}</span>
                      <span className="font-mono text-[9px] text-bone/30">{new Date(d.created_at).toLocaleDateString("it-IT")}</span>
                    </div>
                  ))}
                </div>
              )}
            </HudPanel>

            <HudPanel label="andamento donazioni" tone="amber">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={groupByPeriod(donazioni.map(d => d.created_at), period)} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(240,235,224,0.3)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,196,0,0.05)" }} />
                  <Bar dataKey="count" name="donazioni" fill="#ffc400" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </HudPanel>
          </div>
        </section>

      </div>
    </div>
  );
}
