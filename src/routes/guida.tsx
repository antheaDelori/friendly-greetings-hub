import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/guida")({
  beforeLoad: () => {
    throw redirect({ to: "/guida/accessi" });
  },
});
