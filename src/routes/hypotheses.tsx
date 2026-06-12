import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssumptionsPanel } from "@/components/simulator/assumptions-panel";

export const Route = createFileRoute("/hypotheses")({
  head: () => ({
    meta: [
      { title: "Hypothèses — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Réglez tarifs, volumes, prélèvements micro, charges, capital et seuils : les dix vues du prévisionnel se recalculent en direct.",
      },
      { property: "og:title", content: "Hypothèses — Simulateur L'AZ du Clean" },
      {
        property: "og:description",
        content: "Paramètres du modèle : tarifs, régime micro, charges, financement.",
      },
    ],
  }),
  component: HypothesesPage,
});

function HypothesesPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Hypothèses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Saisissez ici tarifs, volumes, régime et financement. Les autres pages se mettent à jour
            en temps réel.
          </p>
        </div>
        <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
          <Link to="/synthese">
            Voir la synthèse
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <AssumptionsPanel />
    </div>
  );
}
