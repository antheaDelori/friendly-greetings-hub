import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { LangDetectModal } from "@/components/LangDetectModal";

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
      <LangDetectModal />
      <Outlet />
    </>
  );
}
