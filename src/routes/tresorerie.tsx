import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSimulator } from "@/components/simulator-provider";

const TresorerieView = lazy(() =>
  import("@/components/simulator/results-charts").then((m) => ({ default: m.TresorerieView })),
);

export const Route = createFileRoute("/tresorerie")({
  head: () => ({
    meta: [
      { title: "Trésorerie — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Courbe et tableau mois par mois : encaissements à 30 jours, point bas, apport minimal et recommandé.",
      },
      { property: "og:title", content: "Trésorerie — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Trésorerie sur 12 mois et besoin de financement." },
    ],
  }),
  component: TresoreriePage,
});

function TresoreriePage() {
  const { hypotheses, result } = useSimulator();
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted/40" />}>
      <TresorerieView h={hypotheses} m={result} />
    </Suspense>
  );
}
