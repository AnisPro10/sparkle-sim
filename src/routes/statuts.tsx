import { createFileRoute } from "@tanstack/react-router";
import { StatusesView } from "@/components/simulator/statuses-view";
import { useSimulator } from "@/components/simulator-provider";

export const Route = createFileRoute("/statuts")({
  head: () => ({
    meta: [
      { title: "Statuts juridiques — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Micro (VFL, ACRE, barème), EI au réel, EURL, SASU : net en poche annuel comparé à CA identique, au comparateur juridique certifié.",
      },
      { property: "og:title", content: "Statuts juridiques — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Le guide de choix du statut, chiffré." },
    ],
  }),
  component: StatutsPage,
});

function StatutsPage() {
  const { hypotheses, result } = useSimulator();
  return <StatusesView h={hypotheses} m={result} />;
}
