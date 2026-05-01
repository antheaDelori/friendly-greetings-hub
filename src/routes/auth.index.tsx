import { createFileRoute, Link } from "@tanstack/react-router";
import { HudPanel, PageShell, HudInput, HudButton } from "@/components/HudPanel";

export const Route = createFileRoute("/auth/")({
  component: AuthLanding,
});

function AuthLanding() {
  return (
    <PageShell code="// MODULE/AUTH.gateway" title="Accesso terminale" subtitle="Tre porte. Una libreria. Scegli con cosa entrare.">
      <div className="grid md:grid-cols-3 gap-6">
        <HudPanel label="opzione 01 — registrazione" tone="cyan">
          <h3 className="font-display text-2xl text-bone tracking-tight">Registrati</h3>
          <p className="mt-3 font-serif italic text-bone/70">Per leggere e per pubblicare le tue opere.</p>
          <Link to="/auth/registrazione" className="mt-6 inline-block">
            <HudButton variant="primary">▸ Crea account</HudButton>
          </Link>
        </HudPanel>

        <HudPanel label="opzione 02 — login" tone="magenta">
          <h3 className="font-display text-2xl text-bone tracking-tight">Accedi</h3>
          <p className="mt-3 font-serif italic text-bone/70">Hai già un account? Identificati.</p>
          <form className="mt-6 space-y-4">
            <HudInput label="user" placeholder="@username" />
            <HudInput label="password" type="password" placeholder="••••••••" />
            <HudButton variant="magenta" type="button" className="w-full">◆ Login</HudButton>
          </form>
        </HudPanel>

        <HudPanel label="opzione 03 — solo lettore" tone="amber">
          <h3 className="font-display text-2xl text-bone tracking-tight">Solo lettore</h3>
          <p className="mt-3 font-serif italic text-bone/70">Accesso gratuito a tutti i contenuti pubblici. Nessuna registrazione.</p>
          <Link to="/catalogo" className="mt-6 inline-block">
            <HudButton variant="ghost">▸ Entra come ospite</HudButton>
          </Link>
        </HudPanel>
      </div>
    </PageShell>
  );
}
