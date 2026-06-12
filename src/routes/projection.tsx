import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CFE_YEAR2, euro, percent, type YearProjection } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { SectionHead } from "@/components/simulator/results";

export const Route = createFileRoute("/projection")({
  head: () => ({
    meta: [
      { title: "Projection 5 ans — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Projection sur 5 ans : croissance paramétrable, taux plein dès l'an 2, CFE, seuils TVA et plafond micro — parité avec le prévisionnel certifié.",
      },
      { property: "og:title", content: "Projection 5 ans — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "CA et net projetés sur 5 ans, seuils inclus." },
    ],
  }),
  component: ProjectionPage,
});

type RowDef = {
  label: string;
  get: (y: YearProjection) => string;
  strong?: boolean;
  tone?: (y: YearProjection) => "good" | "bad" | undefined;
};

function ProjectionPage() {
  const { hypotheses: h, result } = useSimulator();
  const years = result.projection;
  const maxAbs = Math.max(1, ...years.map((y) => Math.abs(y.net)));

  const ROWS: RowDef[] = [
    { label: "Chiffre d'affaires", get: (y) => euro(y.revenue) },
    {
      label: "Net (avant matériel initial)",
      get: (y) => euro(y.net),
      strong: true,
      tone: (y) => (y.net >= 0 ? "good" : "bad"),
    },
    {
      label: "TVA",
      get: (y) => (y.vat ? "à facturer" : "franchise"),
      tone: (y) => (y.vat ? undefined : "good"),
    },
    {
      label: "Régime micro",
      get: (y) => (y.micro ? "plafond dépassé → société" : "OK"),
      tone: (y) => (y.micro ? "bad" : "good"),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionHead
            title="Projection sur 5 ans"
            desc={`Croissance ${h.growth.map((g) => percent(g)).join(" · ")} — réglable dans Hypothèses. Taux plein dès l'année 2 (fin de l'ACRE), CFE estimée ${euro(CFE_YEAR2)}/an, net avant matériel initial.`}
          />
        </div>
        <Link
          to="/hypotheses"
          className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors shrink-0 print:hidden"
        >
          Régler la croissance →
        </Link>
      </div>

      {/* Barres de net par année (CSS, sans dépendance graphique) */}
      <Card>
        <CardContent className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            Net par année
          </div>
          <div className="flex items-end gap-4 h-44" role="img" aria-label="Net annuel sur 5 ans">
            {years.map((y) => {
              const hgt = (Math.abs(y.net) / maxAbs) * 100;
              const pos = y.net >= 0;
              return (
                <div key={y.year} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span
                    className={cn(
                      "mb-1 text-[11px] font-mono font-semibold tabular-nums",
                      pos ? "text-success" : "text-destructive",
                    )}
                  >
                    {euro(y.net)}
                  </span>
                  <div
                    className="w-full max-w-[64px] flex items-end justify-center"
                    style={{ height: `${Math.max(4, hgt)}%` }}
                  >
                    <div
                      className={cn("w-full rounded-t-md", pos ? "bg-success" : "bg-destructive")}
                      style={{ height: "100%" }}
                    />
                  </div>
                  <span className="mt-2 text-xs font-medium text-muted-foreground">{y.year}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tableau détaillé */}
      <Card>
        <CardContent className="p-5">
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <caption className="sr-only">
                Projection du CA, du net et des seuils sur 5 ans
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wider py-2 pr-3"
                  >
                    Indicateur
                  </th>
                  {years.map((y) => (
                    <th
                      key={y.year}
                      scope="col"
                      className="text-right py-2 px-3 font-display text-sm font-semibold"
                    >
                      {y.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-border/60">
                    <th
                      scope="row"
                      className={cn(
                        "text-left font-normal py-2 pr-3",
                        row.strong ? "text-foreground font-semibold" : "text-muted-foreground",
                      )}
                    >
                      {row.label}
                    </th>
                    {years.map((y) => {
                      const t = row.tone?.(y);
                      return (
                        <td
                          key={y.year}
                          className={cn(
                            "text-right py-2 px-3 font-mono tabular-nums",
                            row.strong ? "font-bold" : "font-medium",
                            t === "good"
                              ? "text-success"
                              : t === "bad"
                                ? "text-destructive"
                                : "text-foreground",
                          )}
                        >
                          {row.get(y)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">Plafond micro {euro(h.microCeiling)}</Badge>
            <Badge variant="secondary">Seuil TVA {euro(h.vatCeiling)}</Badge>
            <Badge variant="secondary">CFE {euro(CFE_YEAR2)}/an dès l'an 2</Badge>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
            L'année 1 affiche {euro(years[0]?.net ?? 0)} : c'est le net avant le matériel initial de{" "}
            {euro(h.capex)} (le net réel de la Synthèse, {euro(result.realNet)}, le déduit). Le
            dépassement du seuil TVA dès l'année 2 est anticipé et neutre pour les clients
            professionnels. À affiner avec un expert-comptable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
