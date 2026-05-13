import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

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
};

type AccessLog = {
  id: string;
  event: string;
  status: string;
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
  const [bookStats, setBookStats] = useState<BookStats>({ count: 0, letture: 0, downloads: 0 });
  const [logs, setLogs] = useState<AccessLog[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) { window.location.replace("/auth"); return; }

      setEmail(user.email ?? null);
      const uid = user.id;

      const [profileRes, authorRes, booksRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("nome, cognome, pseudonimo, is_blocked, block_reason, created_at").eq("id", uid).single(),
        supabase.from("author_profiles").select("bio, generi").eq("id", uid).maybeSingle(),
        supabase.from("books").select("letture, downloads").eq("author_id", uid),
        supabase.from("access_logs").select("id, event, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (authorRes.data) setAuthorProfile(authorRes.data);

      if (booksRes.data) {
        setBookStats({
          count: booksRes.data.length,
          letture: booksRes.data.reduce((s, b) => s + (b.letture ?? 0), 0),
          downloads: booksRes.data.reduce((s, b) => s + (b.downloads ?? 0), 0),
        });
      }

      if (logsRes.data) setLogs(logsRes.data);
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
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "opere", value: bookStats.count, color: "text-cyan" },
                  { label: "letture", value: bookStats.letture, color: "text-bone" },
                  { label: "download", value: bookStats.downloads, color: "text-magenta" },
                ].map(k => (
                  <div key={k.label} className="text-center border border-cyan/15 py-3">
                    <div className={`font-display text-2xl ${k.color}`}>{k.value}</div>
                    <div className="font-mono text-[9px] tracking-widest text-bone/40 uppercase mt-1">{k.label}</div>
                  </div>
                ))}
              </div>
              {bookStats.count === 0 && (
                <p className="font-serif italic text-bone/50 text-sm">Nessuna opera pubblicata ancora.</p>
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
      </PageShell>
      <SiteFooter />
    </div>
  );
}
