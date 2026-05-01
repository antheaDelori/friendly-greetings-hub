import { createFileRoute, Link } from "@tanstack/react-router";
import { HudPanel, PageShell, HudInput, HudButton } from "@/components/HudPanel";

export const Route = createFileRoute("/auth/profilo-autore")({
  head: () => ({
    meta: [
      { title: "Profilo autore — Liberiamo la mente" },
      { name: "description", content: "Crea il tuo profilo autore: bio, generi pubblicati, accesso all'area riservata." },
    ],
  }),
  component: ProfiloAutorePage,
});

function ProfiloAutorePage() {
  return (
    <PageShell code="// AUTH/AUTHOR_PROFILE" title="Profilo autore" subtitle="Il tuo biglietto da visita olografico. Quello che i lettori vedranno per primo.">
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Avatar plate */}
        <HudPanel label="avatar" tone="cyan" className="flex flex-col items-center text-center">
          <div className="relative w-44 h-44 hud-frame">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/30 to-magenta/20 flicker" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-bone/60">
              ◊
            </div>
            <div className="absolute inset-0" style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 2px, oklch(0.82 0.16 200 / 0.1) 2px, oklch(0.82 0.16 200 / 0.1) 3px)"
            }} />
          </div>
          <button className="mt-5 font-mono text-[10px] tracking-widest text-cyan uppercase hover:text-magenta transition-colors">
            ▸ carica foto
          </button>
          <div className="mt-6 hud-divider w-full" />
          <p className="mt-4 font-mono text-[10px] tracking-widest text-bone/40 uppercase">
            CHANNEL_ID: pending
          </p>
        </HudPanel>

        <div className="space-y-6">
          <HudPanel label="biografia">
            <h3 className="font-display text-xl text-bone tracking-tight">Chi sei, in poche righe</h3>
            <textarea
              placeholder="Una bibliotecaria notturna che scrive racconti tra le 2 e le 5 del mattino..."
              className="mt-4 w-full min-h-32 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all"
            />
          </HudPanel>

          <HudPanel label="generi di pubblicazione" tone="magenta">
            <p className="font-serif italic text-bone/70">Seleziona almeno un genere. Potrai cambiarli quando vuoi.</p>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["libro", "racconto", "saggio", "articolo"].map((g) => (
                <label key={g} className="cursor-pointer">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="border border-cyan/30 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-bone/70 text-center peer-checked:border-magenta peer-checked:bg-magenta/15 peer-checked:text-magenta peer-checked:glow-magenta transition-all hover:border-cyan">
                    ◆ {g}
                  </div>
                </label>
              ))}
            </div>
          </HudPanel>

          <HudPanel label="area riservata" tone="amber">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-bone tracking-tight">Pronto al lancio</h3>
                <p className="mt-2 font-serif italic text-bone/70">
                  Salva il profilo, poi entra nella tua area riservata per gestire le opere.
                </p>
              </div>
              <div className="flex gap-3">
                <HudButton variant="primary">▸ Salva</HudButton>
                <Link to="/area-autore"><HudButton variant="magenta">◆ Area riservata</HudButton></Link>
              </div>
            </div>
          </HudPanel>
        </div>
      </div>
    </PageShell>
  );
}
