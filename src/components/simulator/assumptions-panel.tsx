import { useEffect, useId, useState } from "react";
import { RotateCcw, Minus, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  activePresetId,
  boundsOf,
  OFFICIAL,
  PRESETS,
  type Hypotheses,
} from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";

// Icône ⓘ : explique à quoi sert le champ dans la simulation (survol ou focus clavier).
export function InfoDot({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          aria-label="À quoi sert ce champ ?"
          className="inline-grid h-4 w-4 place-items-center rounded-full text-muted-foreground/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring align-middle"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-popover text-popover-foreground border border-border shadow-md">
        <span className="block text-xs leading-relaxed text-muted-foreground">{text}</span>
      </TooltipContent>
    </Tooltip>
  );
}

// Champ numérique professionnel : saisie au clavier + pas à pas (−/+), unité, bornes,
// et infobulle ⓘ expliquant le rôle du champ dans la simulation.
export function NumberField({
  label,
  value,
  set,
  min,
  max,
  step,
  unit,
  hint,
  info,
}: {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
  info?: string;
}) {
  const id = useId();
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // Resynchronise depuis le modèle (reset, préréglage) seulement hors saisie active.
  useEffect(() => {
    if (!focused) setRaw(String(value));
  }, [value, focused]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const parse = (str: string) => parseFloat(str.replace(",", "."));
  const onChange = (str: string) => {
    setRaw(str);
    const n = parse(str);
    if (!Number.isNaN(n)) set(clamp(n));
  };
  const nudge = (dir: number) => {
    const base = clamp(Number.isNaN(parse(raw)) ? value : parse(raw));
    const n = clamp(Math.round((base + dir * step) / step) * step * 10000) / 10000;
    set(n);
    setRaw(String(n));
  };

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-foreground/80"
      >
        {label}
        {info && <InfoDot text={info} />}
      </label>
      <div className="flex items-stretch h-9 rounded-md border border-input bg-background overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-ring">
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Diminuer ${label}`}
          onClick={() => nudge(-1)}
          className="px-2 grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={raw}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setRaw(String(value));
          }}
          className="min-w-0 flex-1 bg-transparent px-1 text-center text-sm font-mono font-semibold tabular-nums text-foreground outline-none border-x border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && (
          <span className="px-2 grid place-items-center text-[11px] text-muted-foreground whitespace-nowrap select-none">
            {unit}
          </span>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Augmenter ${label}`}
          onClick={() => nudge(1)}
          className="px-2 grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-input"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

/** NumberField branché sur un champ du modèle : bornes lues dans le moteur. */
function Field({
  field,
  label,
  step,
  unit,
  hint,
  info,
  asPercent,
}: {
  field: keyof Hypotheses;
  label: string;
  step: number;
  unit?: string;
  hint?: string;
  info?: string;
  asPercent?: boolean;
}) {
  const { hypotheses: h, setField } = useSimulator();
  const bounds = boundsOf(field) ?? { min: 0, max: Infinity };
  const raw = h[field] as number;
  return (
    <NumberField
      label={label}
      value={asPercent ? Math.round(raw * 1000) / 10 : raw}
      set={(v) => setField(field, (asPercent ? v / 100 : v) as never)}
      min={asPercent ? bounds.min * 100 : bounds.min}
      max={asPercent ? bounds.max * 100 : bounds.max}
      step={step}
      unit={unit}
      hint={hint}
      info={info}
    />
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  cols,
}: {
  label: string;
  options: { v: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  cols: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid ${cols} gap-2`}>
      {options.map((o) => {
        const sel = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => onChange(o.v)}
            className={cn(
              "h-9 rounded-md text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              sel
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Rubrique dépliée : titre + grille de champs.
function Section({
  title,
  desc,
  children,
  action,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold">{title}</h3>
            {desc && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>}
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">{children}</div>
);

export function AssumptionsPanel() {
  const { hypotheses: h, setField, applyPreset } = useSimulator();
  const preset = activePresetId(h);

  return (
    <div className="space-y-5">
      {/* 1 · Préréglages & régime */}
      <Section
        title="Préréglage & régime"
        desc="Choisissez le jeu d'hypothèses de départ et les options du régime micro."
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              applyPreset(OFFICIAL);
              toast.success("Hypothèses réinitialisées (préréglage officiel)");
            }}
            className="h-8 text-xs gap-1.5 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
          </Button>
        }
      >
        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Préréglage des charges
              </span>
              {preset === null && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                  Personnalisé
                </Badge>
              )}
            </div>
            <Segmented
              label="Préréglage des charges"
              cols="grid-cols-2"
              value={preset}
              onChange={(id) => {
                const p = PRESETS.find((x) => x.id === id);
                if (p) {
                  applyPreset(p.hypotheses);
                  toast.success(`Préréglage « ${p.name} » appliqué`);
                }
              }}
              options={[
                { v: "officiel", label: "Officiel" },
                { v: "realiste", label: "Réaliste" },
              ]}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              Officiel = prévisionnel audité (dossier préfecture). Réaliste = toutes les charges
              terrain (impayés, renouvellement matériel).
            </p>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              ACRE (1ʳᵉ année, QPV)
            </span>
            <Segmented<"oui" | "non">
              label="ACRE"
              cols="grid-cols-2"
              value={h.acre ? "oui" : "non"}
              onChange={(v) => setField("acre", v === "oui")}
              options={[
                { v: "oui", label: "Activée" },
                { v: "non", label: "Non" },
              ]}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              Cotisations 15,9 % au lieu de 21,2 % — réservée aux adresses en QPV (vérifier sur
              sig.ville.gouv.fr). Gain ≈ 1 500 €/an.
            </p>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Impôt sur le revenu
            </span>
            <Segmented<"vfl" | "bareme">
              label="Impôt sur le revenu"
              cols="grid-cols-2"
              value={h.vfl ? "vfl" : "bareme"}
              onChange={(v) => setField("vfl", v === "vfl")}
              options={[
                { v: "vfl", label: "Libératoire" },
                { v: "bareme", label: "Barème" },
              ]}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              Libératoire : 1,7 % du CA payé au fil de l'eau. Barème : TMI sur 50 % du CA, visible
              au compte de résultat.
            </p>
          </div>
        </div>
      </Section>

      {/* 2 · Tarifs & durées */}
      <Section
        title="Tarifs & durées"
        desc="Le cœur commercial : taux horaires, contrats annuels, durée des prestations."
      >
        <Grid>
          <Field
            field="hourlyB2B"
            label="Taux B2B standard"
            step={1}
            unit="€/h"
            info="Tarif horaire de référence des contrats B2B mensuels. Les contrats annuels bénéficient de la remise ci-contre. Levier n°1 de la marge."
          />
          <Field
            field="annualShare"
            label="Part contrats annuels"
            step={5}
            unit="%"
            asPercent
            info="Part des clients ayant signé le contrat annuel à tacite reconduction (remisé). Plus elle monte, plus le CA est sécurisé mais remisé."
          />
          <Field
            field="annualDiscount"
            label="Remise annuelle"
            step={0.1}
            unit="%"
            asPercent
            hint="6,7 % ≈ 28 €/h au lieu de 30."
            info="Remise consentie sur les contrats annuels. Elle coûte ≈ 240 €/an par contrat mais coûte moins cher que perdre le client."
          />
          <Field
            field="visitsPerWeek"
            label="Passages / semaine"
            step={1}
            unit="passages"
            info="Fréquence d'entretien d'un site B2B type. 2 passages/semaine est le standard des petits bureaux."
          />
          <Field
            field="hoursPerVisit"
            label="Heures / passage"
            step={0.1}
            unit="h"
            info="Durée moyenne d'un passage sur un site type (< 200 m²). Pilote le CA par site ET les heures consommées sur la capacité."
          />
          <Field
            field="glassRate"
            label="Vitrerie"
            step={1}
            unit="€/h"
            info="Tarif horaire des interventions vitrerie (2 h par intervention). Activité d'appoint à bonne marge."
          />
          <Field
            field="airbnbPrice"
            label="Rotation Airbnb"
            step={5}
            unit="€/rotation"
            info="Prix d'un ménage complet entre deux locataires (2,5 h). Payé comptant — excellent pour la trésorerie."
          />
          <Field
            field="privateRate"
            label="Particuliers"
            step={1}
            unit="€/h"
            info="Tarif horaire des ménages chez les particuliers (3 h par prestation). Sans crédit d'impôt (B2B > 30 % du CA) — assumé plein tarif."
          />
          <Field
            field="privateHours"
            label="Heures / prestation particulier"
            step={0.5}
            unit="h"
            info="Durée moyenne d'une prestation chez un particulier."
          />
        </Grid>
      </Section>

      {/* 3 · Prélèvements micro */}
      <Section
        title="Prélèvements micro-entreprise"
        desc="Les taux 2026 du régime micro — déjà câblés sur le prévisionnel certifié."
      >
        <Grid>
          <Field
            field="socialRate"
            label="Cotisations sociales"
            step={0.1}
            unit="%"
            asPercent
            info="21,2 % du CA encaissé pour les services BIC en 2026. Couvre maladie, retraite, allocations."
          />
          <Field
            field="acreRate"
            label="Taux ACRE"
            step={0.1}
            unit="%"
            asPercent
            info="15,9 % pour les créations postérieures au 01/07/2026 (QPV uniquement). Appliqué sur tout l'exercice, comme dans le prévisionnel."
          />
          <Field
            field="taxRate"
            label="Versement libératoire"
            step={0.1}
            unit="%"
            asPercent
            info="1,7 % du CA pour les services BIC. Sous condition de revenu fiscal de référence."
          />
          <Field
            field="cfpRate"
            label="Formation (CFP)"
            step={0.1}
            unit="%"
            asPercent
            info="0,3 % du CA pour un artisan — finance vos propres formations via le CPF."
          />
          <Field
            field="tmi"
            label="TMI du foyer"
            step={1}
            unit="%"
            asPercent
            info="Tranche marginale d'imposition — utilisée si le versement libératoire est désactivé (impôt sur 50 % du CA)."
          />
        </Grid>
      </Section>

      {/* 4 · Charges */}
      <Section
        title="Charges variables & fixes"
        desc="Produits, déplacements, impayés (variables) et abonnements mensuels (fixes)."
      >
        <Grid>
          <Field
            field="productsRate"
            label="Produits d'entretien"
            step={0.5}
            unit="% du CA"
            asPercent
            info="Consommables : détergents, microfibres, sacs. 4 % en officiel, 5,5 % en réaliste terrain."
          />
          <Field
            field="travelRate"
            label="Déplacements"
            step={0.5}
            unit="% du CA"
            asPercent
            info="Carburant et stationnement. La stratégie « tache d'huile » (clients groupés) le maintient bas."
          />
          <Field
            field="unpaidRate"
            label="Impayés B2B"
            step={0.5}
            unit="% du B2B"
            asPercent
            hint="0 % en officiel, 1,5 % en réaliste."
            info="Part du CA B2B jamais encaissée malgré les relances (J+35)."
          />
          <Field
            field="fixedMonthly"
            label="Charges fixes"
            step={5}
            unit="€/mois"
            info="RC pro 15 + véhicule 12 + téléphone 15 + logiciel de facturation 25 + banque 8 = 75 €/mois en officiel."
          />
          <Field
            field="renewalMonthly"
            label="Renouvellement matériel"
            step={5}
            unit="€/mois"
            hint="0 en officiel, 30 € en réaliste."
            info="Provision mensuelle pour remplacer le matériel qui s'use (aspirateur, monobrosse)."
          />
        </Grid>
      </Section>

      {/* 5 · Capital, capacité & seuils */}
      <Section
        title="Capital, capacité & seuils"
        desc="Le financement du démarrage et les plafonds réglementaires 2026."
      >
        <Grid>
          <Field
            field="contribution"
            label="Apport"
            step={100}
            unit="€"
            info="Épargne + don familial formalisé (formulaire 2735). Il doit couvrir le matériel initial et le point bas de trésorerie."
          />
          <Field
            field="capex"
            label="Matériel initial"
            step={50}
            unit="€"
            info="Aspirateur pro, monobrosse, kit vitrerie, consommables de départ — payé au mois 1."
          />
          <Field
            field="delayedShare"
            label="B2B encaissé à 30 jours"
            step={5}
            unit="%"
            asPercent
            info="Part du CA B2B + vitrerie payée le mois suivant la facture. Airbnb et particuliers paient comptant."
          />
          <Field
            field="target"
            label="Objectif net mensuel"
            step={50}
            unit="€/mois"
            info="Le seuil de viabilité personnel : 1 500 €/mois nets dans l'étude. La Synthèse affiche le premier mois où il est atteint."
          />
          <Field
            field="capacity"
            label="Capacité solo"
            step={5}
            unit="h/mois"
            info="Maximum d'heures facturables seul (165 h ≈ 38 h/semaine). Au-delà de 85 % d'occupation : hausse des tarifs ; au-delà de 90 % : embauche."
          />
          <Field
            field="microCeiling"
            label="Plafond micro"
            step={100}
            unit="€"
            info="83 600 € de CA de services (2026-2028). Au-delà : sortie du régime micro vers une société."
          />
          <Field
            field="vatCeiling"
            label="Seuil franchise TVA"
            step={100}
            unit="€"
            info="37 500 € en 2026. Dépassement attendu dès l'année 2 — neutre pour les clients professionnels."
          />
        </Grid>
      </Section>

      {/* 6 · Projection 5 ans */}
      <Section
        title="Projection 5 ans"
        desc="Croissance du CA année par année — comme l'onglet Projection_5ans du prévisionnel."
      >
        <Grid>
          {h.growth.map((g, i) => (
            <NumberField
              key={i}
              label={`Croissance année ${i + 2}`}
              value={Math.round(g * 1000) / 10}
              set={(v) =>
                setField(
                  "growth",
                  h.growth.map((x, j) => (j === i ? v / 100 : x)),
                )
              }
              min={-90}
              max={300}
              step={5}
              unit="%"
              info={`Croissance du CA appliquée à l'année ${i + 1}. Défaut : ${[30, 20, 10, 10][i]} %.`}
            />
          ))}
        </Grid>
        <p className="mt-4 text-[11px] text-muted-foreground leading-snug">
          La projection applique le taux plein dès l'année 2 (fin de l'ACRE) et une CFE estimée à
          300 €/an. Le net projeté s'entend avant matériel initial.
        </p>
      </Section>
    </div>
  );
}
