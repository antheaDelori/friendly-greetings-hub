import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/guida")({
  // "/guida" è il layout genitore di /guida/accessi|catalogo|gestione: il beforeLoad
  // gira anche per le sotto-pagine, quindi va limitato al path esatto "/guida"
  // per non ricadere in un redirect infinito verso /guida/accessi.
  beforeLoad: ({ location }) => {
    if (location.pathname === "/guida") {
      throw redirect({ to: "/guida/accessi" });
    }
  },
});
