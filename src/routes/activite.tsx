import { createFileRoute } from "@tanstack/react-router";
import { ActivityPlan } from "@/components/simulator/activity-plan";

export const Route = createFileRoute("/activite")({
  head: () => ({
    meta: [
      { title: "Plan d'activité — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Pilotez les 12 mois : sites B2B, saisonnalité, vitrerie, Airbnb, particuliers — CA, heures et net recalculés en direct.",
      },
      { property: "og:title", content: "Plan d'activité — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Tableau 12 mois éditable du plan d'activité." },
    ],
  }),
  component: ActivitePage,
});

function ActivitePage() {
  return <ActivityPlan />;
}
