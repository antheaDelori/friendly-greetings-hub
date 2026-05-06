import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/")({
  component: AuthLanding,
});

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";
const labelClass = "font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase";

function AuthLanding() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loginAttempted = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !loginAttempted.current || !session) return;

      const userId = session.user.id;
      const userEmail = session.user.email ?? "";

      // Controlla se l'utente è bloccato
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked, block_reason")
        .eq("id", userId)
        .single();

      if (profile?.is_blocked) {
        await supabase.from("access_logs").insert({
          user_id: userId,
          email: userEmail,
          event: "blocked",
          status: "blocked",
          reason: profile.block_reason ?? "Account bloccato",
        });
        await supabase.auth.signOut();
        loginAttempted.current = false;
        setError(`Accesso bloccato: ${profile.block_reason ?? "contatta l'amministratore"}`);
        setLoading(false);
        return;
      }

      // Log accesso riuscito
      await supabase.from("access_logs").insert({
        user_id: userId,
        email: userEmail,
        event: "login",
        status: "success",
      });

      window.location.replace("/");
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    loginAttempted.current = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        loginAttempted.current = false;
        setError("Credenziali non valide. Riprova.");
        setLoading(false);
      }
      // successo: onAuthStateChange gestisce il blocco, il log e la navigazione
    } catch {
      loginAttempted.current = false;
      setError("Errore di connessione. Riprova.");
      setLoading(false);
    }
  };

  return (
    <PageShell code="// MODULE/AUTH.gateway" title="Accesso terminale" subtitle="Tre porte. Una libreria. Scegli con cosa entrare.">
      <div className="grid md:grid-cols-3 gap-6">

        {/* Registrazione */}
        <HudPanel label="opzione 01 — registrazione" tone="cyan">
          <h3 className="font-display text-2xl text-bone tracking-tight">Registrati</h3>
          <p className="mt-3 font-serif italic text-bone/70">Per leggere e per pubblicare le tue opere.</p>
          <Link to="/auth/registrazione" className="mt-6 inline-block">
            <HudButton variant="primary">▸ Crea account</HudButton>
          </Link>
        </HudPanel>

        {/* Login */}
        <HudPanel label="opzione 02 — login" tone="magenta">
          <h3 className="font-display text-2xl text-bone tracking-tight">Accedi</h3>
          <p className="mt-3 font-serif italic text-bone/70">Hai già un account? Identificati.</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <span className={labelClass}>↳ email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@dominio.it"
                required
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>↳ password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>
            {error && (
              <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-3 py-2">
                ⚠ {error}
              </p>
            )}
            <HudButton variant="magenta" type="submit" disabled={loading} className="w-full">
              {loading ? "◆ Accesso..." : "◆ Login"}
            </HudButton>
          </form>
        </HudPanel>

        {/* Solo lettore */}
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
