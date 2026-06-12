import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSimulator } from "@/components/simulator-provider";

// Tableau de bord (lazy) : importe recharts à la demande pour le hero + graphes.
const SyntheseView = lazy(() =>
  import("@/components/simulator/results-charts").then((m) => ({ default: m.SyntheseView })),
);

export const Route = createFileRoute("/synthese")({
  head: () => ({
    meta: [
      { title: "Synthèse — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Tableau de bord : net réel, trésorerie, capacité et seuils du projet de nettoyage professionnel L'AZ du Clean.",
      },
      { property: "og:title", content: "Synthèse — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Indicateurs clés et graphiques du projet." },
    ],
  }),
  component: SynthesePage,
});

function SynthesePage() {
  const { hypotheses, result } = useSimulator();
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted/40" />}>
      <SyntheseView h={hypotheses} m={result} />
    </Suspense>
  );
}
