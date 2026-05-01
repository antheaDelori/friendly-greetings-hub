import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accesso — Liberiamo la mente" },
      { name: "description", content: "Registrati come autore o lettore, oppure accedi al tuo account." },
      { property: "og:title", content: "Accesso — Liberiamo la mente" },
      { property: "og:description", content: "Identifica il tuo terminale per entrare nella biblioteca olografica." },
    ],
  }),
  component: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </div>
  ),
});
