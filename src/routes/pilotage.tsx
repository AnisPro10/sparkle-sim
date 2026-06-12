import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ClipboardList, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { euro, excelRound, globalRate, MONTHS, safePercent } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import {
  loadActuals,
  saveActuals,
  totalCa,
  type Actuals,
  type MonthActuals,
} from "@/components/simulator/actuals-store";
import { InfoDot } from "@/components/simulator/assumptions-panel";
import { SectionHead } from "@/components/simulator/results";
import { InfoTerm } from "@/components/simulator/info-term";

export const Route = createFileRoute("/pilotage")({
  head: () => ({
    meta: [
      { title: "Pilotage — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Saisissez le réalisé de chaque mois, comparez au prévisionnel (alerte au-delà de 15 % d'écart) et lisez l'atterrissage d'année recalculé.",
      },
      { property: "og:title", content: "Pilotage — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Réel vs prévu et atterrissage d'année." },
    ],
  }),
  component: PilotagePage,
});

const SERIES: { key: keyof MonthActuals; label: string }[] = [
  { key: "b2b", label: "B2B réel (€)" },
  { key: "glass", label: "Vitrerie réelle (€)" },
  { key: "airbnb", label: "Airbnb réel (€)" },
  { key: "private", label: "Particuliers réel (€)" },
  { key: "hours", label: "Heures réelles" },
];

// Règle de la phase 9 de l'étude : écart de CA > 15 % → action écrite (cause + remède).
const ALERT_THRESHOLD = 0.15;

function PilotagePage() {
  const { hypotheses: h, result } = useSimulator();
  const [actuals, setActuals] = useState<Actuals>({});
  useEffect(() => {
    setActuals(loadActuals());
  }, []);

  const setValue = (monthIdx: number, key: keyof MonthActuals, raw: string) => {
    setActuals((old) => {
      const next: Actuals = { ...old, [monthIdx]: { ...old[monthIdx] } };
      if (raw.trim() === "") {
        delete next[monthIdx][key];
        if (Object.keys(next[monthIdx]).length === 0) delete next[monthIdx];
      } else {
        const n = Number(raw.replace(",", "."));
        if (!Number.isFinite(n) || n < 0) return old;
        next[monthIdx][key] = n;
      }
      saveActuals(next);
      return next;
    });
  };

  // Net de gestion d'un CA réel : la formule mensuelle du moteur appliquée au réalisé.
  const netOfCa = useMemo(() => {
    const rate = globalRate(h);
    return (ca: number) =>
      excelRound(
        ca * (1 - rate - h.productsRate - h.travelRate) - h.fixedMonthly - h.renewalMonthly,
      );
  }, [h]);

  const rows = useMemo(
    () =>
      result.months.map((m, i) => {
        const actual = actuals[i];
        const actualCa = actual ? totalCa(actual) : undefined;
        const gap = actualCa !== undefined ? (actualCa - m.ca) / (m.ca || 1) : undefined;
        return {
          idx: i,
          month: m.month,
          plannedCa: m.ca,
          plannedNet: m.netGestion,
          actualCa,
          actualNet: actualCa !== undefined ? netOfCa(actualCa) : undefined,
          actualHours: actual?.hours,
          plannedHours: m.hours,
          gap,
          alert: gap !== undefined && Math.abs(gap) > ALERT_THRESHOLD,
        };
      }),
    [result, actuals, netOfCa],
  );

  const filled = rows.filter((r) => r.actualCa !== undefined);
  // Atterrissage : mois saisis en RÉEL + mois restants en PRÉVU.
  const landingCa = rows.reduce((s, r) => s + (r.actualCa ?? r.plannedCa), 0);
  const landingNet = rows.reduce((s, r) => s + (r.actualNet ?? r.plannedNet), 0) - h.capex;
  const alerts = filled.filter((r) => r.alert);

  return (
    <div className="space-y-5">
      <SectionHead
        title="Pilotage — réel vs prévu"
        desc="Chaque fin de mois, saisissez le réalisé : l'écart au plan et l'atterrissage d'année se recalculent. La saisie reste sur cet appareil et part dans l'export JSON."
      />

      {alerts.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <span>
            Écart de CA supérieur à 15 % sur{" "}
            <strong>{alerts.map((a) => a.month).join(", ")}</strong> — règle de pilotage de l'étude
            : écrire la cause et le remède (revue mensuelle d'une heure), puis ajuster la
            prospection ou les hypothèses.
          </span>
        </div>
      )}

      {/* Atterrissage */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <InfoTerm term="Atterrissage (re-prévision)">Atterrissage CA</InfoTerm>
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">{euro(landingCa)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              plan : {euro(result.revenue)} ·{" "}
              {filled.length > 0
                ? `${filled.length} mois en réel + ${12 - filled.length} en prévu`
                : "aucun réel saisi : 100 % plan"}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-l-4",
            landingNet >= result.realNet ? "border-l-success" : "border-l-warning",
          )}
        >
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Atterrissage net réel
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">{euro(landingNet)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              plan : {euro(result.realNet)} · écart {euro(landingNet - result.realNet)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Mois au-dessus du plan
            </p>
            <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">
              {filled.filter((r) => (r.gap ?? 0) >= 0).length} / {filled.length || 0}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              sur les mois renseignés · objectif : zéro alerte rouge
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saisie du réel */}
      <Card className="overflow-hidden">
        <CardContent className="p-5 pb-0">
          <div className="mb-1 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">Saisie du réalisé</h3>
            <InfoDot text="À chaque fin de mois, reportez le CA réellement facturé par activité (et les heures travaillées). Laissez vide les mois non écoulés : ils restent au prévisionnel dans l'atterrissage. Les montants viennent de votre livre des recettes ou de votre logiciel de facturation." />
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Reportez le facturé réel de chaque mois écoulé — champ vide = mois au prévisionnel.
          </p>
        </CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <caption className="sr-only">Saisie du chiffre d'affaires réel par mois</caption>
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-card text-left font-medium py-2.5 pl-5 pr-3"
                >
                  Série
                </th>
                {MONTHS.map((m) => (
                  <th key={m} scope="col" className="text-right font-medium py-2.5 px-2">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERIES.map(({ key, label }) => (
                <tr key={key} className="border-t border-border/60">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-card text-left font-medium text-foreground/80 py-1.5 pl-5 pr-3 whitespace-nowrap"
                  >
                    {label}
                  </th>
                  {MONTHS.map((_, i) => (
                    <td key={i} className="py-1 px-1">
                      <input
                        aria-label={`${label} — ${MONTHS[i]}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="—"
                        value={actuals[i]?.[key] ?? ""}
                        onChange={(e) => setValue(i, key, e.target.value)}
                        className="h-9 w-full min-w-16 rounded-md border border-input bg-background text-center font-mono text-sm font-medium tabular-nums outline-none transition-shadow placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Comparaison réel vs prévu */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">
              <InfoTerm term="Réel vs prévu">Écarts au plan</InfoTerm>
            </h3>
            <InfoDot text="CA réel comparé au CA prévu du même mois. Vert : au-dessus du plan. Orange/rouge : en dessous ; au-delà de 15 % d'écart (dans un sens comme dans l'autre), la ligne s'allume — c'est le seuil d'action de l'étude." />
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Comparaison mensuelle du réel et du prévu</caption>
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 text-left font-medium">
                    Mois
                  </th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">
                    CA prévu
                  </th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">
                    CA réel
                  </th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">
                    Écart
                  </th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">
                    Net prévu / réel
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Heures prévues / réelles
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.month}
                    className={cn("border-t border-border/60", r.alert && "bg-warning/10")}
                  >
                    <th
                      scope="row"
                      className="py-2 pr-3 text-left font-normal text-muted-foreground"
                    >
                      {r.month}
                      {r.alert && (
                        <Badge variant="warning" className="ml-2 text-[9px] px-1.5 py-0">
                          &gt; 15 %
                        </Badge>
                      )}
                    </th>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {euro(r.plannedCa)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                      {r.actualCa !== undefined ? euro(r.actualCa) : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-2 px-3 text-right font-mono tabular-nums font-semibold",
                        r.gap === undefined
                          ? "text-muted-foreground"
                          : r.gap >= 0
                            ? "text-success"
                            : "text-destructive",
                      )}
                    >
                      {r.gap !== undefined
                        ? `${r.gap >= 0 ? "+" : ""}${safePercent(r.gap, 1)}`
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {euro(r.plannedNet)}
                      {r.actualNet !== undefined && (
                        <>
                          {" / "}
                          <span
                            className={cn(
                              r.actualNet >= r.plannedNet ? "text-success" : "text-destructive",
                              "font-semibold",
                            )}
                          >
                            {euro(r.actualNet)}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-2 pl-3 text-right font-mono tabular-nums text-muted-foreground">
                      {r.plannedHours} h{r.actualHours !== undefined ? ` / ${r.actualHours} h` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
            Le net réel d'un mois saisi applique la formule du prévisionnel au CA réalisé (mêmes
            taux, mêmes charges fixes). Première vraie revue de gestion : fin novembre 2026, avec
            trois mois de réel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
