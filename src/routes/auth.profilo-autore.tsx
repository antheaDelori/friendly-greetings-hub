import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/profilo-autore")({
  head: () => ({
    meta: [
      { title: "Profilo autore — Liberiamo la mente" },
      { name: "description", content: "Crea il tuo profilo autore: bio, generi pubblicati, accesso all'area riservata." },
    ],
  }),
  component: ProfiloAutorePage,
});

const GENERI: { value: string; label: string; tooltip?: string }[] = [
  { value: "libro", label: "Libro" },
  { value: "racconto", label: "Racconto" },
  { value: "saggio", label: "Saggio" },
  { value: "articolo", label: "Articolo" },
  { value: "buonanotte", label: "Buonanotte", tooltip: "Racconti della sera" },
  { value: "poesia", label: "Poesia" },
];

function ProfiloAutorePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [generi, setGeneri] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);
      supabase
        .from("author_profiles")
        .select("bio, generi")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) {
            setBio(profile.bio ?? "");
            setGeneri(profile.generi ?? []);
          }
          setLoading(false);
        });
    });
  }, []);

  const toggleGenere = (g: string) =>
    setGeneri((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from("author_profiles")
      .upsert({ id: userId, bio, generi }, { onConflict: "id" });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
    }
  };

  if (loading) {
    return (
      <PageShell code="// AUTH/AUTHOR_PROFILE" title="Profilo autore" subtitle="">
        <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento in corso...</p>
      </PageShell>
    );
  }

  return (
    <PageShell code="// AUTH/AUTHOR_PROFILE" title="Profilo autore" subtitle="Il tuo biglietto da visita olografico. Quello che i lettori vedranno per primo.">
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">

        {/* Avatar plate */}
        <HudPanel label="avatar" tone="cyan" className="flex flex-col items-center text-center">
          <div className="relative w-44 h-44 hud-frame">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/30 to-magenta/20" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-bone/60">
              ◊
            </div>
          </div>
          <p className="mt-4 font-mono text-[10px] tracking-widest text-bone/40 uppercase">
            Upload foto — prossimo step
          </p>
        </HudPanel>

        <div className="space-y-6">
          {/* Biografia */}
          <HudPanel label="biografia">
            <h3 className="font-display text-xl text-bone tracking-tight">Chi sei, in poche righe</h3>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Una bibliotecaria notturna che scrive racconti tra le 2 e le 5 del mattino..."
              className="mt-4 w-full min-h-32 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all"
            />
          </HudPanel>

          {/* Generi */}
          <HudPanel label="generi di pubblicazione" tone="magenta">
            <p className="font-serif italic text-bone/70">Seleziona almeno un genere. Potrai cambiarli quando vuoi.</p>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GENERI.map(({ value, label, tooltip }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleGenere(value)}
                  className={`relative group border px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-center transition-all ${
                    generi.includes(value)
                      ? "border-magenta bg-magenta/15 text-magenta"
                      : "border-cyan/30 text-bone/70 hover:border-cyan"
                  }`}
                >
                  ◆ {label}
                  {tooltip && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap border border-cyan/40 bg-void px-2 py-1 font-mono text-[8px] tracking-widest text-cyan opacity-0 transition-opacity group-hover:opacity-100 z-10">
                      {tooltip}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </HudPanel>

          {/* Salva */}
          <HudPanel label="area riservata" tone="amber">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-bone tracking-tight">Pronto al lancio</h3>
                <p className="mt-2 font-serif italic text-bone/70">
                  Salva il profilo, poi entra nella tua area riservata per gestire le opere.
                </p>
                {error && (
                  <p className="mt-2 font-mono text-[11px] text-magenta">⚠ {error}</p>
                )}
                {saved && (
                  <p className="mt-2 font-mono text-[11px] text-cyan">✓ Profilo salvato correttamente.</p>
                )}
              </div>
              <div className="flex gap-3">
                <HudButton variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? "▸ Salvataggio..." : "▸ Salva"}
                </HudButton>
                <Link to="/area-autore">
                  <HudButton variant="magenta">◆ Area riservata</HudButton>
                </Link>
              </div>
            </div>
          </HudPanel>
        </div>
      </div>
    </PageShell>
  );
}
