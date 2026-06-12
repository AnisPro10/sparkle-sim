import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScenarioManager } from "@/components/simulator/scenario-manager";
import { useSimulator } from "@/components/simulator-provider";

const ScenariosView = lazy(() =>
  import("@/components/simulator/results-charts").then((m) => ({ default: m.ScenariosView })),
);

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Scénarios — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Pessimiste, réaliste, optimiste : sensibilité aux volumes et aux prix, comparaison des préréglages, scénarios nommés sauvegardables.",
      },
      { property: "og:title", content: "Scénarios — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Analyse de sensibilité du projet." },
    ],
  }),
  component: ScenariosPage,
});

function ScenariosPage() {
  const { hypotheses, result } = useSimulator();
  return (
    <div className="space-y-5">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted/40" />}>
        <ScenariosView h={hypotheses} m={result} />
      </Suspense>
      <ScenarioManager />
    </div>
  );
}
