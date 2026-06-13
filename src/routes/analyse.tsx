import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, Dices, Grid3X3, TornadoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { euro, percent } from "@/lib/simulator-model";
import { goalSeek, monteCarlo, sensitivityMatrix, tornado } from "@/lib/advanced-analysis";
import { useSimulator } from "@/components/simulator-provider";
import { NumberField, InfoDot } from "@/components/simulator/form-fields";
import { SectionHead } from "@/components/simulator/results";
import { InfoTerm } from "@/components/simulator/info-term";

export const Route = createFileRoute("/analyse")({
  head: () => ({
    meta: [
      { title: "Analyse avancée — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Sensibilité sites × taux horaire, tornado des leviers, objectif inversé (goal seek) et simulation Monte-Carlo dans les bornes de l'étude de marché.",
      },
      { property: "og:title", content: "Analyse avancée — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Sensibilité, goal seek et Monte-Carlo." },
    ],
  }),
  component: AnalysePage,
});

/* --- 1. Matrice de sensibilité (parité onglet Sensibilite du classeur) --- */
function MatrixCard() {
  const { hypotheses: h } = useSimulator();
  const m = useMemo(() => sensitivityMatrix(h), [h]);
  const all = m.rows.flatMap((r) => r.cells);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const heat = (v: number) => {
    const t = max > min ? (v - min) / (max - min) : 0.5;
    return `color-mix(in oklab, var(--success) ${Math.round(t * 28)}%, var(--card))`;
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">
            Sensibilité — sites × taux horaire
          </h3>
          <InfoDot text="Chaque case = le net d'un mois PLEIN (hors creux d'août) si vous avez N sites au taux T, appoints Airbnb/particuliers au plateau inclus. La même grille que l'onglet Sensibilité du prévisionnel Excel. Repérez la première case ≥ votre objectif : c'est le nombre de sites minimal pour en vivre." />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Net mensuel d'un mois plein — la case encadrée est votre couple actuel ({m.current.sites}{" "}
          sites × {m.current.rate} €/h).
        </p>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[460px] border-collapse text-sm">
            <caption className="sr-only">
              Net mensuel en croisière selon le nombre de sites et le taux horaire
            </caption>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                  Sites ↓ / Taux →
                </th>
                {m.rates.map((r) => (
                  <th key={r} scope="col" className="py-1.5 px-2 text-right font-semibold">
                    {r} €/h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.rows.map((row) => (
                <tr key={row.sites} className="border-t border-border/60">
                  <th scope="row" className="py-1.5 pr-2 text-left font-semibold">
                    {row.sites} sites
                  </th>
                  {row.cells.map((v, j) => {
                    const isCurrent =
                      row.sites === m.current.sites && m.rates[j] === m.current.rate;
                    const aboveGoal = v >= h.target;
                    return (
                      <td
                        key={j}
                        className={cn(
                          "py-1.5 px-2 text-right font-mono tabular-nums",
                          aboveGoal ? "font-semibold" : "text-muted-foreground",
                          isCurrent && "ring-2 ring-foreground/50 rounded font-bold",
                        )}
                        style={{ background: heat(v) }}
                      >
                        {euro(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
          Cases en gras : objectif de {euro(h.target)}/mois atteint. Au préréglage officiel, cette
          grille est identique à l'onglet Sensibilité du classeur certifié (case 12 × 30 : 3 646 €).
        </p>
      </CardContent>
    </Card>
  );
}

/* --- 2. Tornado : quel levier compte le plus --- */
function TornadoCard() {
  const { hypotheses: h } = useSimulator();
  const t = useMemo(() => tornado(h), [h]);
  const maxSpan = Math.max(1, ...t.items.map((i) => i.span));
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <TornadoIcon className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">
            <InfoTerm term="Tornado">Tornado des leviers</InfoTerm>
          </h3>
          <InfoDot text="Chaque levier varie de ±10 % pendant que tout le reste est figé : la longueur de la barre montre de combien le net réel annuel bouge. Les barres les plus longues = vos vrais leviers de pilotage — concentrez l'effort commercial dessus." />
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Effet d'une variation de ±10 % de chaque levier sur le net réel ({euro(t.base)}).
        </p>
        <div
          className="space-y-2"
          role="img"
          aria-label="Classement des leviers par impact sur le net"
        >
          {t.items.map((item) => {
            const lowDelta = item.low - t.base;
            const highDelta = item.high - t.base;
            const w = (Math.abs(highDelta - lowDelta) / maxSpan) * 100;
            return (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <span className="w-56 shrink-0 truncate text-muted-foreground">{item.label}</span>
                <div className="relative h-5 flex-1 rounded bg-muted/40">
                  <div
                    className="absolute inset-y-1 rounded-sm"
                    style={{
                      left: "2%",
                      width: `${Math.max(3, w * 0.96)}%`,
                      background:
                        "linear-gradient(90deg, var(--destructive), var(--chart-b2b), var(--success))",
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="w-36 shrink-0 text-right font-mono tabular-nums">
                  <span className="text-destructive">{euro(lowDelta)}</span>
                  {" / "}
                  <span className="text-success">+{euro(highDelta)}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
          Lecture : « {t.items[0]?.label} » est votre levier n° 1 — chaque point d'effort y rapporte
          plus que partout ailleurs.
        </p>
      </CardContent>
    </Card>
  );
}

/* --- 3. Goal seek : objectif inversé --- */
function GoalSeekCard() {
  const { hypotheses: h } = useSimulator();
  const [goal, setGoal] = useState(2000);
  const results = useMemo(() => goalSeek(h, goal), [h, goal]);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">
            <InfoTerm term="Objectif inversé (goal seek)">Objectif inversé</InfoTerm>
          </h3>
          <InfoDot text="Le calcul à l'envers : vous fixez le net mensuel de croisière visé, le simulateur résout chaque levier séparément (les deux autres restant à leur valeur actuelle) : quel taux horaire ? combien de sites ? quelle durée de passage ?" />
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          « Je veux X €/mois en croisière → que faut-il changer ? » Chaque levier est résolu seul,
          le reste inchangé.
        </p>
        <div className="max-w-56">
          <NumberField
            label="Net mensuel visé (croisière)"
            value={goal}
            set={setGoal}
            min={0}
            max={20000}
            step={100}
            unit="€/mois"
            info="Le net de gestion mensuel que vous visez une fois le carnet rempli (juin-août). Pour mémoire : l'étude vise 1 500 € et le plan officiel atteint 2 948 €."
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {results.map((r) => (
            <div
              key={r.lever}
              className={cn(
                "rounded-lg border p-3",
                r.required === null ? "border-destructive/40 bg-destructive/5" : "border-border",
              )}
            >
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {r.lever}
              </p>
              {r.required === null ? (
                <p className="mt-2 text-sm font-semibold text-destructive">
                  Inatteignable avec ce seul levier
                </p>
              ) : (
                <>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                    {r.required.toLocaleString("fr-FR")}{" "}
                    <span className="text-sm font-medium text-muted-foreground">{r.unit}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    aujourd'hui : {r.current.toLocaleString("fr-FR")} {r.unit} · net obtenu :{" "}
                    {r.achievedNet !== null ? euro(r.achievedNet) : "—"}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* --- 4. Monte-Carlo : incertitude --- */
function MonteCarloCard() {
  const { hypotheses: h } = useSimulator();
  const [seed, setSeed] = useState(42);
  const mc = useMemo(() => monteCarlo(h, 2000, seed), [h, seed]);
  const maxCount = Math.max(...mc.histogram.map((b) => b.count));
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Dices className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">
              <InfoTerm term="Monte-Carlo">Simulation Monte-Carlo</InfoTerm>
            </h3>
            <InfoDot text="2 000 années simulées en tirant au sort chaque levier dans les bornes de l'étude de marché (sites ±35 %, prix ±5 %, appoints −40 %/+25 %, impayés 0-3 %). On lit la DISTRIBUTION des nets possibles plutôt qu'un chiffre unique — c'est la photo du risque réel du projet." />
          </div>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Relancer les tirages
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {mc.runs.toLocaleString("fr-FR")} années simulées dans les bornes de l'étude de marché.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Couloir central (P10 → P90)
            </p>
            <p className="mt-2 font-mono text-lg font-bold tabular-nums">
              {euro(mc.p10)} → {euro(mc.p90)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              médiane {euro(mc.p50)} — 80 % des années simulées tombent dans ce couloir
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              mc.probGoal >= 0.8
                ? "border-success/50 bg-success/5"
                : "border-warning/50 bg-warning/10",
            )}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Probabilité d'atteindre l'objectif
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums">{percent(mc.probGoal)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              net mensuel moyen ≥ {euro(h.target)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              mc.probNegativeCash <= 0.1
                ? "border-success/50 bg-success/5"
                : "border-destructive/50 bg-destructive/5",
            )}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Risque de trésorerie négative
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
              {percent(mc.probNegativeCash)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              au moins un mois sous zéro avec l'apport de {euro(h.contribution)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Distribution du net réel annuel
          </p>
          <div
            className="flex h-28 items-end gap-px"
            role="img"
            aria-label={`Histogramme des nets simulés, de ${euro(mc.histogram[0]?.from ?? 0)} à ${euro(mc.histogram[mc.histogram.length - 1]?.to ?? 0)}`}
          >
            {mc.histogram.map((b, i) => (
              <div
                key={i}
                title={`${euro(b.from)} → ${euro(b.to)} : ${b.count} années`}
                className="flex-1 rounded-t-sm bg-[var(--chart-b2b)] opacity-80"
                style={{ height: `${Math.max(2, (b.count / maxCount) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{euro(mc.histogram[0]?.from ?? 0)}</span>
            <span>{euro(mc.histogram[mc.histogram.length - 1]?.to ?? 0)}</span>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
          Tirages reproductibles (même graine = mêmes résultats) — extension d'analyse, hors
          périmètre du classeur certifié.
        </p>
      </CardContent>
    </Card>
  );
}

function AnalysePage() {
  return (
    <div className="space-y-5">
      <SectionHead
        title="Analyse avancée"
        desc="Quatre instruments pour stresser le modèle : la grille de sensibilité du classeur, le classement des leviers, le calcul à l'envers et la photo du risque."
      />
      <MatrixCard />
      <div className="grid gap-5 xl:grid-cols-2">
        <TornadoCard />
        <GoalSeekCard />
      </div>
      <MonteCarloCard />
    </div>
  );
}
