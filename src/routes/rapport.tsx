import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CAPACITY_CRITICAL,
  civilYear2026Check,
  euro,
  legalStatuses,
  percent,
  safePercent,
} from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";

export const Route = createFileRoute("/rapport")({
  head: () => ({
    meta: [
      { title: "Rapport — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Le dossier de synthèse imprimable : verdict, chiffres clés, scénarios, statuts juridiques, projection et critères de viabilité.",
      },
      { property: "og:title", content: "Rapport — Simulateur L'AZ du Clean" },
      { property: "og:description", content: "Synthèse imprimable du prévisionnel." },
    ],
  }),
  component: RapportPage,
});

const FORMALITY_TOTAL = 785;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 border-b border-border pb-1 font-display text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1 text-sm last:border-0">
      <span className={cn(strong ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("font-mono tabular-nums", strong && "font-bold")}>{value}</span>
    </div>
  );
}

function RapportPage() {
  const { hypotheses: h, result: m } = useSimulator();
  const statuses = legalStatuses(h, m.revenue);
  const civil = civilYear2026Check(h, m);
  const viable = m.fundable && m.targetMonth !== null;
  const startupNeed = FORMALITY_TOTAL + h.capex;
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-xl font-semibold">Rapport de synthèse</h1>
          <p className="text-xs text-muted-foreground">
            Le dossier compact à remettre à la banque ou au conseiller — imprimez-le ou
            enregistrez-le en PDF (bouton ci-contre ou Ctrl+P).
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimer / PDF
        </Button>
      </div>

      {/* En-tête du document */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
                Prévisionnel financier · micro-entreprise
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">L'AZ du Clean</h2>
              <p className="text-sm italic text-muted-foreground">La propreté qui tient parole.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Nettoyage professionnel B2B — Seine-Saint-Denis & Paris · Anis Azgag · édité le{" "}
                {today}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider",
                viable ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              {viable ? "Projet viable" : "À retravailler"}
            </span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Chiffres issus du moteur en parité vérifiée avec le prévisionnel Excel certifié (audit
            du 12/06/2026) — mêmes formules, mêmes arrondis. Exercice : septembre 2026 → août 2027.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <Block title="Résultats de l'année 1">
              <Line label="Chiffre d'affaires" value={euro(m.revenue)} />
              <Line label="Net réel (après matériel initial)" value={euro(m.realNet)} strong />
              <Line label="Net mensuel moyen" value={euro(Math.round(m.realNet / 12))} />
              <Line label="Net de croisière (juin-août)" value={euro(m.cruiseNet)} />
              <Line
                label={`Objectif ${euro(h.target)}/mois atteint`}
                value={m.targetMonth ?? "non atteint"}
                strong
              />
              <Line label="Marge nette (/ CA)" value={safePercent(m.realNet, m.revenue)} />
            </Block>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Block title="Financement & trésorerie">
              <Line label="Apport de départ" value={euro(h.contribution)} />
              <Line label="Besoin de départ (formalités + matériel)" value={euro(startupNeed)} />
              <Line label="Point bas de trésorerie" value={euro(m.lowCash)} strong />
              <Line
                label="Apport minimal / recommandé"
                value={`${euro(m.minimumContribution)} / ${euro(m.recommendedContribution)}`}
              />
              <Line label="Créances clients fin d'exercice" value={euro(m.endReceivables)} />
              <Line
                label="Verdict de financement"
                value={m.fundable ? "trésorerie jamais négative" : "apport insuffisant"}
                strong
              />
            </Block>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <Block title="Scénarios — votre plan face aux bornes du marché">
            <div className="grid gap-2 sm:grid-cols-3">
              {m.scenarios.map((s) => (
                <div key={s.name} className="rounded-md border border-border px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.name}
                  </p>
                  <p className="font-mono text-lg font-bold tabular-nums">{euro(s.net)}</p>
                  <p className="text-[11px] text-muted-foreground">CA {euro(s.ca)}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Le scénario pessimiste (volumes −35 à −40 %, prix −5 %) reste positif : le projet ne
              repose pas sur un scénario héroïque.
            </p>
          </Block>
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <Block title="Statut juridique — classement">
              {statuses.slice(0, 4).map((s, i) => (
                <Line
                  key={s.id}
                  label={`${i + 1}. ${s.name}`}
                  value={euro(Math.round(s.value))}
                  strong={i === 0}
                />
              ))}
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                Net en poche annuel à CA identique — comparateur juridique certifié.
              </p>
            </Block>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Block title="Projection 5 ans">
              {m.projection.map((p) => (
                <Line
                  key={p.year}
                  label={`${p.year}${p.vat ? " · TVA" : ""}${p.micro ? " · sortie micro" : ""}`}
                  value={`${euro(p.revenue)} → ${euro(p.net)}`}
                />
              ))}
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                CA → net avant matériel initial. Seuil TVA proratisé 2026 :{" "}
                {euro(civil.vatThresholdProrated)} ({civil.vatExceeded ? "dépassé" : "respecté"}
                ).
              </p>
            </Block>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <Block title="Critères de viabilité">
            <div className="grid gap-x-6 sm:grid-cols-2">
              <Line
                label="Apport couvre le point bas"
                value={m.fundable ? "oui" : "non"}
                strong={!m.fundable}
              />
              <Line
                label="Objectif atteint avant 6 mois"
                value={
                  m.targetMonthIndex !== null && m.targetMonthIndex < 6
                    ? `oui (${m.targetMonth})`
                    : "non"
                }
              />
              <Line
                label={`Occupation au pic ≤ ${percent(CAPACITY_CRITICAL)}`}
                value={`${percent(m.maxOccupancy)} (${m.peakHours} h / ${h.capacity} h)`}
              />
              <Line
                label="Scénario pessimiste positif"
                value={m.scenarios[0].net > 0 ? `oui (${euro(m.scenarios[0].net)})` : "non"}
              />
            </div>
          </Block>
          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
            Document de simulation à visée indicative, généré par le simulateur L'AZ du Clean.
            Hypothèses fiscales et sociales 2026 (cotisations micro-BIC 21,2 %, VFL 1,7 %, CFP
            artisan 0,3 %, plafond 83 600 €, franchise TVA 37 500 €). À valider avec un
            expert-comptable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
