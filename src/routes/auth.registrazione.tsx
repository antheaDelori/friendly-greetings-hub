import { createFileRoute, Link } from "@tanstack/react-router";
import { HudPanel, PageShell, HudInput, HudButton } from "@/components/HudPanel";

export const Route = createFileRoute("/auth/registrazione")({
  head: () => ({
    meta: [
      { title: "Registrazione — Liberiamo la mente" },
      { name: "description", content: "Crea il tuo profilo lettore o autore sulla biblioteca olografica." },
    ],
  }),
  component: RegistrazionePage,
});

function RegistrazionePage() {
  return (
    <PageShell code="// AUTH/REGISTER.form" title="Nuovo terminale" subtitle="Tre passi e sei dentro. I campi obbligatori sono in cyan.">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <HudPanel label="dati_principali" code="REQ ★">
          <form className="grid sm:grid-cols-2 gap-5">
            <HudInput label="Nome ★" placeholder="Es. Anthea" />
            <HudInput label="Cognome ★" placeholder="Es. De Lori" />
            <HudInput label="E-mail ★" type="email" placeholder="tu@dominio.holo" />
            <HudInput label="Telefono" placeholder="+39 ..." />
            <div className="sm:col-span-2">
              <HudInput label="Avatar (URL)" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ password ★</span>
              <input type="password" placeholder="••••••••" className="mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 focus:glow-cyan transition-all" />
            </div>
          </form>

          <details className="mt-6 group">
            <summary className="font-mono tracking-[0.25em] text-[10px] text-magenta uppercase cursor-pointer hover:text-cyan transition-colors">
              ▸ campi facoltativi
            </summary>
            <div className="mt-4 grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <HudInput label="Indirizzo" placeholder="Via, città, CAP" />
              </div>
              <HudInput label="Data di nascita" type="date" />
              <HudInput label="Pseudonimo" placeholder="Nome d'arte" />
            </div>
          </details>

          <div className="mt-8 flex flex-wrap gap-3 items-center">
            <HudButton type="button" variant="primary">▸ Conferma registrazione</HudButton>
            <Link to="/auth" className="font-mono text-[10px] tracking-widest uppercase text-bone/60 hover:text-cyan transition-colors">
              annulla
            </Link>
          </div>
        </HudPanel>

        <HudPanel label="vuoi pubblicare?" tone="magenta">
          <h3 className="font-display text-xl text-bone tracking-tight">Sei anche autore?</h3>
          <p className="mt-3 font-serif italic text-bone/70">
            Configura il tuo profilo autore: bio, generi di pubblicazione, area riservata.
          </p>
          <Link to="/auth/profilo-autore" className="mt-5 inline-block">
            <HudButton variant="magenta">◆ Configura profilo autore</HudButton>
          </Link>
          <div className="hud-divider my-6" />
          <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">
            ⚠ La conferma via email arriva entro 60 secondi.
          </p>
        </HudPanel>
      </div>
    </PageShell>
  );
}
