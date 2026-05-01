import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Liberiamo la mente — il mondo dei creativi" },
      { name: "description", content: "Una piattaforma indipendente per leggere libri, racconti, saggi e articoli e per dialogare con i loro autori. Read or perish." },
      { name: "author", content: "Liberiamo la mente" },
      { property: "og:title", content: "Liberiamo la mente — Read or Perish" },
      { property: "og:description", content: "Libri, racconti, saggi e articoli pubblicati direttamente dagli autori. Leggi online, scarica, commenta, sostieni." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
