import { createFileRoute } from "@tanstack/react-router";
import { SimulatorApp } from "@/components/simulator-app";
import { SimulatorProvider } from "@/components/simulator-provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulateur financier | L'AZ du Clean" },
      { name: "description", content: "Simulez la viabilité, la trésorerie et le statut juridique de L’AZ du Clean." },
      { property: "og:title", content: "Simulateur financier — L'AZ du Clean" },
      { property: "og:description", content: "Prévisionnel interactif de l’activité de nettoyage B2B L’AZ du Clean." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SimulatorProvider>
      <SimulatorApp />
    </SimulatorProvider>
  );
}
