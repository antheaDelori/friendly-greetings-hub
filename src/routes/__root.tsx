import { Outlet, Link, createRootRoute, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LangDetectModal } from "@/components/LangDetectModal";
import { trackPageView } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";

function PageViewTracker() {
  const { location } = useRouterState();
  useEffect(() => { trackPageView(location.pathname); }, [location.pathname]);
  return null;
}

// Rete di sicurezza: se una sessione con temp-password attiva naviga altrove
// senza passare dal login (es. tab già aperta), la reindirizza comunque.
function MustChangePasswordGuard() {
  const { location } = useRouterState();
  useEffect(() => {
    if (location.pathname.startsWith("/auth")) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();
      if (!cancelled && profile?.must_change_password) {
        window.location.replace("/auth/cambia-password");
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);
  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass p-10 hud-frame max-w-md text-center">
        <h1 className="font-display text-7xl text-magenta text-glow-magenta">404</h1>
        <h2 className="mt-4 font-display text-2xl text-bone tracking-tight">Pagina non trovata</h2>
        <p className="mt-2 font-mono text-[10px] tracking-widest text-cyan/60 uppercase">
          ERR / NODE_NOT_IN_GRID
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-cyan bg-cyan/10 text-cyan px-5 py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-cyan hover:text-void transition-all"
          >
            ▸ torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <>
      <PageViewTracker />
      <MustChangePasswordGuard />
      <LangDetectModal />
      <Outlet />
    </>
  );
}
