import { lazy, Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Columns2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeModel, euro, percent } from "@/lib/simulator-model";
import { ScenarioManager } from "@/components/simulator/scenario-manager";
import { InfoDot } from "@/components/simulator/form-fields";
import { useSimulator } from "@/components/simulator-provider";

const ScenariosView = lazy(() =>
  import("@/components/simulator/results-charts").then((m) => ({ default: m.ScenariosView })),
);

/** Comparaison côte à côte de deux scénarios sauvegardés (ou la simulation courante). */
function SavedComparison() {
  const { hypotheses, saved } = useSimulator();
  const options = useMemo(
    () => [
      { id: "__current__", name: "Simulation courante", hypotheses },
      ...saved.map((s) => ({ id: s.name, name: s.name, hypotheses: s.hypotheses })),
    ],
    [hypotheses, saved],
  );
  const [leftId, setLeftId] = useState("__current__");
  const [rightId, setRightId] = useState(saved[0]?.name ?? "__current__");
  const left = options.find((o) => o.id === leftId) ?? options[0];
  const right = options.find((o) => o.id === rightId) ?? options[0];
  const mLeft = useMemo(() => computeModel(left.hypotheses), [left]);
  const mRight = useMemo(() => computeModel(right.hypotheses), [right]);

  if (saved.length === 0) return null;

  const rows = [
    { label: "Chiffre d'affaires année 1", get: (m: typeof mLeft) => euro(m.revenue) },
    { label: "Net réel année 1", get: (m: typeof mLeft) => euro(m.realNet), strong: true },
    { label: "Net de croisière", get: (m: typeof mLeft) => euro(m.cruiseNet) },
    { label: "Point bas de trésorerie", get: (m: typeof mLeft) => euro(m.lowCash) },
    {
      label: "Occupation au pic",
      get: (m: typeof mLeft) => `${percent(m.maxOccupancy)} (${m.peakHours} h)`,
    },
    {
      label: "Objectif atteint",
      get: (m: typeof mLeft) => m.targetMonth ?? "non atteint",
    },
  ];

  const select = (value: string, set: (v: string) => void, label: string) => (
    <select
      value={value}
      onChange={(e) => set(e.target.value)}
      aria-label={label}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-medium outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <Columns2 className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">Comparer deux scénarios</h3>
          <InfoDot text="Mettez côte à côte deux jeux d'hypothèses sauvegardés (ou la simulation courante) : chaque colonne est recalculée par le même moteur certifié. Pratique pour trancher « avec ou sans Airbnb », « 30 ou 32 €/h »…" />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Chaque colonne est recalculée intégralement avec ses propres hypothèses.
        </p>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {select(leftId, setLeftId, "Scénario de gauche")}
          {select(rightId, setRightId, "Scénario de droite")}
        </div>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Comparaison de deux scénarios sauvegardés</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="py-2 pr-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Indicateur
              </th>
              <th scope="col" className="py-2 px-3 text-right font-display text-sm font-semibold">
                {left.name}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-display text-sm font-semibold">
                {right.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border/60">
                <th
                  scope="row"
                  className={cn(
                    "py-2 pr-3 text-left font-normal",
                    r.strong ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {r.label}
                </th>
                <td
                  className={cn(
                    "py-2 px-3 text-right font-mono tabular-nums",
                    r.strong && "font-bold",
                  )}
                >
                  {r.get(mLeft)}
                </td>
                <td
                  className={cn(
                    "py-2 pl-3 text-right font-mono tabular-nums",
                    r.strong && "font-bold",
                  )}
                >
                  {r.get(mRight)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

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
      <div className="grid gap-5 xl:grid-cols-2">
        <ScenarioManager />
        <SavedComparison />
      </div>
    </div>
  );
}
