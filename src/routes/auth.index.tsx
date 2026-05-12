import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";
import { books } from "@/data/books";

export const Route = createFileRoute("/auth/")({
  validateSearch: z.object({
    returnTo: z.string().optional(),
  }),
  component: AuthLanding,
});

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";
const labelClass = "font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase";

function AuthLanding() {
  const { returnTo } = Route.useSearch();
  const returnToRef = useRef(returnTo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loginAttempted = useRef(false);

  type ResumeBook = { slug: string; title: string; author: string };
  const [resumeBooks, setResumeBooks] = useState<ResumeBook[]>([]);

  useEffect(() => {
    returnToRef.current = returnTo;
  }, [returnTo]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !loginAttempted.current || !session) return;

      // Defer: esce dallo stack onAuthStateChange prima di fare altre chiamate Supabase
      setTimeout(async () => {
        try {
          const userId = session.user.id;
          const userEmail = session.user.email ?? "";

          const { data: profile } = await supabase
            .from("profiles")
            .select("is_blocked, block_reason")
            .eq("id", userId)
            .single();

          if (profile?.is_blocked) {
            await supabase.from("access_logs").insert({
              user_id: userId, email: userEmail,
              event: "blocked", status: "blocked",
              reason: profile.block_reason ?? "Account bloccato",
            });
            await supabase.auth.signOut();
            loginAttempted.current = false;
            setError(`Accesso bloccato: ${profile.block_reason ?? "contatta l'amministratore"}`);
            setLoading(false);
            return;
          }

          await supabase.from("access_logs").insert({
            user_id: userId, email: userEmail,
            event: "login", status: "success",
          });

          // Se c'è un returnTo esplicito, rispettalo sempre
          if (returnToRef.current) {
            window.location.replace(returnToRef.current);
            return;
          }

          // Cerca libri in lettura nel localStorage
          const inProgress: ResumeBook[] = Object.keys(localStorage)
            .filter(k => k.startsWith("reading_pos_"))
            .map(k => {
              const slug = k.replace("reading_pos_", "");
              const book = books.find(b => b.slug === slug);
              return book ? { slug, title: book.title, author: book.author } : null;
            })
            .filter((b): b is ResumeBook => b !== null);

          if (inProgress.length > 0) {
            setResumeBooks(inProgress);
            setLoading(false);
            return;
          }

          window.location.replace("/");
        } catch {
          window.location.replace(returnToRef.current || "/");
        }
      }, 0);
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

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError("Errore durante l'accesso come ospite. Riprova.");
      setLoading(false);
      return;
    }
    window.location.replace(returnTo || "/catalogo");
  };

  if (resumeBooks.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm scanlines">
        <div className="glass hud-frame mx-4 max-w-lg w-full p-8 md:p-10 fade-up">
          <div className="font-mono text-[10px] tracking-[0.3em] text-cyan/70 uppercase">// segnalibro_attivo</div>
          <h2 className="mt-4 font-display text-3xl md:text-4xl text-bone tracking-tight leading-tight">
            Riprendi da dove<br /><span className="text-cyan text-glow-cyan">hai lasciato?</span>
          </h2>

          {resumeBooks.length === 1 ? (
            <p className="mt-4 font-serif italic text-lg text-bone/70">
              Stavi leggendo <span className="text-bone not-italic font-semibold">{resumeBooks[0].title}</span>
              <span className="text-bone/50"> — {resumeBooks[0].author}</span>
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {resumeBooks.map(b => (
                <li key={b.slug} className="font-serif italic text-bone/70">
                  ▸ <span className="text-bone not-italic">{b.title}</span>
                  <span className="text-bone/50"> — {b.author}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {resumeBooks.length === 1 ? (
              <button
                onClick={() => window.location.replace(`/leggi/${resumeBooks[0].slug}`)}
                className="flex-1 border border-cyan bg-cyan/10 text-cyan px-6 py-3 font-mono tracking-[0.2em] text-[11px] uppercase hover:bg-cyan hover:text-void transition-all hud-frame"
              >
                ▸ Sì, riprendi
              </button>
            ) : (
              <Link
                to="/catalogo"
                className="flex-1 text-center border border-cyan bg-cyan/10 text-cyan px-6 py-3 font-mono tracking-[0.2em] text-[11px] uppercase hover:bg-cyan hover:text-void transition-all hud-frame"
              >
                ▸ Scegli quale riprendere
              </Link>
            )}
            <button
              onClick={() => window.location.replace("/")}
              className="flex-1 border border-bone/20 text-bone/50 px-6 py-3 font-mono tracking-[0.2em] text-[11px] uppercase hover:border-bone/40 hover:text-bone/80 transition-all"
            >
              No, alla home
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <button onClick={handleGuestLogin} disabled={loading} className="mt-6 inline-block">
            <HudButton variant="ghost" disabled={loading}>
              {loading ? "▸ Accesso..." : "▸ Entra come ospite"}
            </HudButton>
          </button>
        </HudPanel>

      </div>
    </PageShell>
  );
}
