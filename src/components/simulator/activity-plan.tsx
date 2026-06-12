import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { boundsOf, euro, MONTHS } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { SectionHead } from "./results";
import { InfoTerm } from "./info-term";

const ROWS = [
  ["sites", "Sites B2B", "Site B2B", 1],
  ["seasonality", "Saisonnalité B2B", "Saisonnalité", 0.05],
  ["glassJobs", "Vitrerie (interventions)", "Taux effectif B2B", 1],
  ["airbnb", "Airbnb (rotations)", "Rotation Airbnb", 1],
  ["privateJobs", "Particuliers (prestations)", "Capacité solo", 1],
] as const;

export function ActivityPlan() {
  const { hypotheses: h, result, setMonthValue } = useSimulator();
  return (
    <section>
      <SectionHead
        title="Plan d'activité · 12 mois"
        desc="Septembre 2026 → août 2027. Le CA, les heures et le net de gestion se recalculent à chaque saisie."
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <caption className="sr-only">
              Plan d'activité mensuel : volumes saisis et résultats calculés
            </caption>
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-card text-left font-medium py-2.5 pl-4 pr-3"
                >
                  Série
                </th>
                {MONTHS.map((mois) => (
                  <th key={mois} scope="col" className="text-right font-medium py-2.5 px-2">
                    {mois}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([key, label, term, step]) => (
                <tr key={key} className="border-t border-border/60">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-card text-left font-medium text-foreground/80 py-1.5 pl-4 pr-3 whitespace-nowrap"
                  >
                    <InfoTerm term={term}>{label}</InfoTerm>
                  </th>
                  {h[key].map((v, i) => (
                    <td key={i} className="py-1 px-1">
                      <input
                        aria-label={`${label} — ${MONTHS[i]}`}
                        type="number"
                        inputMode="decimal"
                        min={boundsOf(key)?.min}
                        max={boundsOf(key)?.max}
                        step={step}
                        value={v}
                        onChange={(e) => {
                          // Cellule vidée pendant la saisie : ne pas committer 0, attendre.
                          if (e.target.value.trim() === "") return;
                          const parsed = Number(e.target.value);
                          if (Number.isFinite(parsed)) {
                            const b = boundsOf(key) ?? { min: 0, max: 500 };
                            setMonthValue(key, i, Math.min(b.max, Math.max(b.min, parsed)));
                          }
                        }}
                        className="h-9 w-full min-w-16 rounded-md border border-input bg-background text-center font-mono text-sm font-medium tabular-nums outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-muted/40 text-left py-2 pl-4 pr-3 backdrop-blur"
                >
                  CA mensuel
                </th>
                {result.months.map((m) => (
                  <td key={m.month} className="text-right py-2 px-2 font-mono tabular-nums">
                    {euro(m.ca)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-border/60 bg-muted/40 font-semibold">
                <th scope="row" className="sticky left-0 z-10 bg-muted/40 text-left py-2 pl-4 pr-3">
                  Net de gestion
                </th>
                {result.months.map((m) => (
                  <td
                    key={m.month}
                    className={cn(
                      "text-right py-2 px-2 font-mono tabular-nums",
                      m.netGestion < 0 ? "text-destructive" : "text-success",
                    )}
                  >
                    {euro(m.netGestion)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-border/60 bg-muted/40">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-muted/40 text-left py-2 pl-4 pr-3 font-semibold"
                >
                  Heures facturées
                </th>
                {result.months.map((m) => (
                  <td
                    key={m.month}
                    className={cn(
                      "text-right py-2 px-2 font-mono tabular-nums",
                      m.overloaded ? "font-bold text-destructive" : "text-foreground",
                    )}
                  >
                    {m.hours} h{m.overloaded && " ⚠"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        Capacité solo : {h.capacity} h facturables/mois. « ⚠ » signale un mois au-delà de la
        capacité — lisser les volumes, augmenter les tarifs des nouveaux contrats ({h.hourlyB2B + 2}
        -{h.hourlyB2B + 4} €/h) ou préparer le palier d'embauche.
      </p>
    </section>
  );
}
