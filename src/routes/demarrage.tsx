import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, ClipboardCheck, Coins, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CAPACITY_CRITICAL, euro, percent } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { ScenarioManager } from "@/components/simulator/scenario-manager";
import { SectionHead } from "@/components/simulator/results";
import { InfoTerm } from "@/components/simulator/info-term";

export const Route = createFileRoute("/demarrage")({
  head: () => ({
    meta: [
      { title: "Démarrage — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Le chemin critique des formalités (préfecture → INPI → titre → lancement), le budget exact de 785 € et les critères de viabilité recalculés en direct.",
      },
      { property: "og:title", content: "Démarrage — Simulateur L'AZ du Clean" },
      {
        property: "og:description",
        content: "Formalités, budget de départ et critères de viabilité.",
      },
    ],
  }),
  component: DemarragePage,
});

// Budget formalités certifié (phase 8 de l'étude, audit du 12/06/2026).
const FORMALITY_BUDGET = [
  { label: "Taxe de première délivrance du titre de séjour (depuis le 01/05/2026)", amount: 350 },
  { label: "Immatriculation INPI — guichet unique, micro 81.21Z", amount: 0 },
  { label: "RC pro (~180 €/an) + avenant véhicule usage pro (~150 €/an)", amount: 330 },
  { label: "Impression plaquettes ×250 + cartes de visite ×250", amount: 65 },
  { label: "Recommandés, photos d'identité, divers", amount: 40 },
] as const;
const FORMALITY_TOTAL = FORMALITY_BUDGET.reduce((s, p) => s + p.amount, 0); // 785 €

const STEPS = [
  "Lire la date d'expiration du titre étudiant (cale tout le calendrier)",
  "Vérifier l'adresse en QPV sur sig.ville.gouv.fr (condition ACRE)",
  "Vérifier le bail + recommandé au bailleur (domiciliation au domicile)",
  "Obtenir 1-2 lettres d'intention B2B datées de moins de 3 mois",
  "Formaliser l'apport familial (don : formulaire 2735 ; prêt : reconnaissance de dette)",
  "Assembler le dossier préfecture (business plan, prévisionnel, lettres, fonds)",
  "Déposer le changement de statut à Bobigny (taxe 350 €)",
  "Obtenir le récépissé — il n'autorise PAS encore le travail (R431-14)",
  "Immatriculation INPI (gratuite) → SIRET + attestation URSSAF",
  "Délivrance du certificat de résidence (cible sept. 2026, plan B oct.-nov.)",
  "RC pro + avenant véhicule + compte bancaire dédié",
  "Demander l'ACRE sous 60 jours si QPV (silence 30 j = accord)",
  "Imprimer les supports avec le SIRET + publier la fiche Google",
  "Signer les premiers contrats = lancement commercial",
] as const;

function DemarragePage() {
  const { hypotheses: h, result } = useSimulator();
  const navigate = useNavigate();
  const [checked, setChecked] = useState<boolean[]>(() => STEPS.map(() => false));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("az-startup-checklist") ?? "null");
      setChecked(STEPS.map((_, i) => Boolean(Array.isArray(saved) && saved[i])));
    } catch {
      /* état neuf */
    }
  }, []);
  const toggle = (i: number, v: boolean) => {
    const next = checked.map((x, j) => (j === i ? v : x));
    setChecked(next);
    try {
      localStorage.setItem("az-startup-checklist", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const startupNeed = FORMALITY_TOTAL + h.capex;
  const criteria = [
    {
      label: "Apport couvrant le point bas de trésorerie",
      ok: result.fundable,
      detail: `point bas ${euro(result.lowCash)}`,
    },
    {
      label: "Objectif net atteint avant 6 mois",
      ok: result.targetMonthIndex !== null && result.targetMonthIndex < 6,
      detail: result.targetMonth ?? "non atteint",
    },
    {
      label: `Occupation au pic sous ${percent(CAPACITY_CRITICAL)}`,
      ok: result.maxOccupancy <= CAPACITY_CRITICAL,
      detail: `${percent(result.maxOccupancy)} (${result.peakHours} h)`,
    },
    {
      label: "Apport ≥ besoin de départ (formalités + matériel)",
      ok: h.contribution >= startupNeed,
      detail: `${euro(h.contribution)} pour ${euro(startupNeed)}`,
    },
    {
      label: "Scénario pessimiste positif (filet de sécurité)",
      ok: result.scenarios[0].net > 0,
      detail: euro(result.scenarios[0].net),
    },
  ];
  const allOk = criteria.every((c) => c.ok);

  return (
    <div className="space-y-5">
      <SectionHead
        title="Prêt à démarrer ?"
        desc="Les formalités dans l'ordre réel du parcours préfecture → INPI → titre → lancement, le budget exact et les critères de viabilité recalculés en direct."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold">Avancement des formalités</h3>
                <p className="text-[11px] text-muted-foreground">
                  Le chemin critique de la phase 8 de l'étude — coché = fait.
                </p>
              </div>
              <span className="text-sm tabular-nums font-mono">
                {checked.filter(Boolean).length} / {STEPS.length}
              </span>
            </div>
            <Progress value={(checked.filter(Boolean).length / STEPS.length) * 100} />
            <div className="mt-5 space-y-1">
              {STEPS.map((s, i) => {
                const stepId = `step-${i}`;
                return (
                  <label
                    key={s}
                    htmlFor={stepId}
                    className="flex cursor-pointer items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
                  >
                    <Checkbox
                      id={stepId}
                      checked={checked[i] ?? false}
                      onCheckedChange={(v) => toggle(i, !!v)}
                    />
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        checked[i] && "text-muted-foreground line-through",
                      )}
                    >
                      {s}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              ⚠ Le <InfoTerm term="Récépissé">récépissé</InfoTerm> « en vue de l'immatriculation »
              garantit le séjour mais n'autorise pas de travailler (art. R431-14 CESEDA) : aucune
              prestation avant la délivrance du titre.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-t-2 border-t-gold">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">Budget formalités</h3>
                  <p className="font-mono text-2xl font-bold tabular-nums">
                    {euro(FORMALITY_TOTAL)}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {FORMALITY_BUDGET.map((p) => (
                  <p key={p.label} className="flex justify-between gap-3">
                    <span className="leading-snug">{p.label}</span>
                    <span className="shrink-0 font-mono font-medium tabular-nums">
                      {p.amount === 0 ? "gratuit" : euro(p.amount)}
                    </span>
                  </p>
                ))}
              </div>
              <div className="my-3 h-px bg-border" />
              <p className="flex justify-between text-sm font-semibold">
                <span>Besoin de départ (avec matériel {euro(h.capex)})</span>
                <span className="font-mono tabular-nums">{euro(startupNeed)}</span>
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  h.contribution >= startupNeed ? "text-success" : "text-destructive",
                )}
              >
                {h.contribution >= startupNeed
                  ? `Couvert par l'apport de ${euro(h.contribution)}.`
                  : `Apport de ${euro(h.contribution)} insuffisant — il manque ${euro(startupNeed - h.contribution)}.`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Dépôt de marque INPI (190 €) : optionnel, hors budget, différable.
              </p>
            </CardContent>
          </Card>

          <Card className={cn("border-l-4", allOk ? "border-l-success" : "border-l-warning")}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">Critères de viabilité</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Recalculés en direct avec vos hypothèses.
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {criteria.map((c) => (
                  <p className="flex items-start gap-2" key={c.label}>
                    {c.ok ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="leading-snug">
                      {c.label} <span className="text-xs text-muted-foreground">({c.detail})</span>
                    </span>
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          <ScenarioManager />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button size="lg" className="gap-2" onClick={() => navigate({ to: "/synthese" })}>
          Lancer la simulation
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Link
          to="/hypotheses"
          className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Régler d'abord les hypothèses →
        </Link>
      </div>
    </div>
  );
}
