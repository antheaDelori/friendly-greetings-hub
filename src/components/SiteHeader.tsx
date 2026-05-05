import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/liberiamo-hero.png";
import { supabase } from "@/lib/supabase";

export function SiteHeader() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setDisplayName(null); return; }
      const meta = user.user_metadata;
      setDisplayName(meta?.pseudonimo || meta?.nome || user.email?.split("@")[0] || "utente");
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadUser());
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const linkBase = "text-[11px] font-mono tracking-[0.18em] uppercase text-bone/70 hover:text-cyan transition-colors";

  return (
    <header className="sticky top-0 z-40 border-b border-cyan/15 bg-void/70 backdrop-blur-xl">
      {/* status bar */}
      <div className="border-b border-cyan/10 bg-deep/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 h-7 flex items-center justify-between font-mono text-[10px] tracking-widest text-cyan/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-cyan rounded-full animate-pulse" />SYS:ONLINE
            </span>
            <span className="hidden sm:inline">// NODE 03 / SECTOR LIB</span>
            <span className="hidden md:inline opacity-50">UPLINK 2076.04.12</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline opacity-60">PROTOCOL: HOLO/v7</span>
            {displayName && (
              <span className="text-cyan">
                ▸ {displayName.toUpperCase()}
              </span>
            )}
            <span className="text-magenta">READ_OR_PERISH.exe</span>
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 hud-frame bg-deep/60 overflow-hidden">
            <img
              src={logo}
              alt="Liberiamo la mente"
              className="h-full w-full object-cover ring-1 ring-cyan/30 flicker"
            />
            <span className="absolute inset-0 bg-cyan/10 mix-blend-overlay pointer-events-none" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-lg tracking-[0.18em] text-bone">
              LIB<span className="text-magenta text-glow-magenta">e</span>RIAMO
            </span>
            <span className="font-mono text-[9px] tracking-[0.25em] text-cyan/70 mt-1 uppercase">
              il mondo dei creativi · 2076
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <Link to="/" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }} activeOptions={{ exact: true }}>Home</Link>
          <Link to="/catalogo" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>Catalogo</Link>
          <Link to="/community" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>Community</Link>
          <Link to="/regolamento" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>Regole</Link>
          <Link to="/donazioni" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>Sostieni</Link>
        </nav>

        <div className="flex items-center gap-2">
          {displayName ? (
            <>
              <Link
                to="/area-autore"
                className="hidden sm:inline-flex font-mono tracking-widest text-[10px] uppercase text-cyan hover:text-magenta transition-colors px-3 py-2"
              >
                [{displayName}]
              </Link>
              <button
                onClick={handleLogout}
                className="relative inline-flex items-center gap-2 border border-magenta/60 bg-magenta/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-magenta hover:bg-magenta hover:text-void transition-all"
              >
                ✕ Esci
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex font-mono tracking-widest text-[10px] uppercase text-bone/70 hover:text-cyan transition-colors px-3 py-2"
              >
                [accedi]
              </Link>
              <Link
                to="/auth/registrazione"
                className="relative inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan hover:text-void transition-all hud-frame-x"
              >
                ▸ Registrati
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
