import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CompteResultatView } from "@/components/simulator/results";
import { useSimulator } from "@/components/simulator-provider";

// La cascade graphique (recharts) est chargée en lazy sous le compte de résultat.
const ResultatWaterfall = lazy(() =>
  import("@/components/simulator/results-charts").then((m) => ({
    default: m.ResultatWaterfall,
  })),
);

export const Route = createFileRoute("/compte-resultat")({
  head: () => ({
    meta: [
      { title: "Compte de résultat — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Cascade analytique par activité : CA, prélèvements, charges variables, contributions, net réel — la structure du prévisionnel certifié.",
      },
      { property: "og:title", content: "Compte de résultat — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Du chiffre d'affaires au net réel, par activité." },
    ],
  }),
  component: CompteResultatPage,
});

function CompteResultatPage() {
  const { hypotheses, result } = useSimulator();
  return (
    <div className="space-y-5">
      <CompteResultatView h={hypotheses} m={result} />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-lg bg-muted/40" />}>
        <ResultatWaterfall h={hypotheses} m={result} />
      </Suspense>
    </div>
  );
}
