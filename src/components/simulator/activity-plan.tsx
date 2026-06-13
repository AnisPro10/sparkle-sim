import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { boundsOf, euro, MONTHS, type B2bContract, type Hypotheses } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { SectionHead } from "./results";
import { InfoDot } from "./form-fields";
import { InfoTerm } from "./info-term";

type SeriesKey = "sites" | "seasonality" | "glassJobs" | "airbnb" | "privateJobs";
type Row = {
  key: SeriesKey;
  label: string;
  term: string;
  step: number;
  /** Interrupteur d'activité associé (absent pour la saisonnalité, paramètre du B2B). */
  toggle?: keyof Pick<
    Hypotheses,
    "enabledB2b" | "enabledGlass" | "enabledAirbnb" | "enabledPrivate"
  >;
  /** L'activité dont dépend la ligne (pour griser la saisonnalité avec le B2B). */
  dependsOn?: keyof Pick<
    Hypotheses,
    "enabledB2b" | "enabledGlass" | "enabledAirbnb" | "enabledPrivate"
  >;
};

const ROWS: Row[] = [
  { key: "sites", label: "Sites B2B", term: "Site B2B", step: 1, toggle: "enabledB2b" },
  {
    key: "seasonality",
    label: "Saisonnalité B2B",
    term: "Saisonnalité",
    step: 0.05,
    dependsOn: "enabledB2b",
  },
  {
    key: "glassJobs",
    label: "Vitrerie (interventions)",
    term: "Taux effectif B2B",
    step: 1,
    toggle: "enabledGlass",
  },
  {
    key: "airbnb",
    label: "Airbnb (rotations)",
    term: "Rotation Airbnb",
    step: 1,
    toggle: "enabledAirbnb",
  },
  {
    key: "privateJobs",
    label: "Particuliers (prestations)",
    term: "Capacité solo",
    step: 1,
    toggle: "enabledPrivate",
  },
];

export function ActivityPlan() {
  const { hypotheses: h, result, setMonthValue, setField } = useSimulator();
  const disabledCount = ROWS.filter((r) => r.toggle && !h[r.toggle]).length;
  return (
    <section>
      <SectionHead
        title="Plan d'activité · 12 mois"
        desc="Septembre 2026 → août 2027. Décochez une activité pour l'exclure de tous les calculs (synthèse, résultat, trésorerie, scénarios…) — les volumes saisis sont conservés."
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
              {ROWS.map(({ key, label, term, step, toggle, dependsOn }) => {
                const active = toggle ? h[toggle] : dependsOn ? h[dependsOn] : true;
                return (
                  <tr
                    key={key}
                    className={cn("border-t border-border/60", !active && "opacity-45")}
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-card text-left font-medium text-foreground/80 py-1.5 pl-4 pr-3 whitespace-nowrap"
                    >
                      <span className="flex items-center gap-2">
                        {toggle ? (
                          <Checkbox
                            checked={h[toggle]}
                            onCheckedChange={(v) => setField(toggle, !!v)}
                            aria-label={
                              h[toggle]
                                ? `Exclure l'activité ${label} des calculs`
                                : `Réintégrer l'activité ${label} dans les calculs`
                            }
                          />
                        ) : (
                          <span className="w-4" aria-hidden="true" />
                        )}
                        <InfoTerm term={term}>{label}</InfoTerm>
                      </span>
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
                          disabled={!active}
                          onChange={(e) => {
                            // Cellule vidée pendant la saisie : ne pas committer 0, attendre.
                            if (e.target.value.trim() === "") return;
                            const parsed = Number(e.target.value);
                            if (Number.isFinite(parsed)) {
                              const b = boundsOf(key) ?? { min: 0, max: 500 };
                              setMonthValue(key, i, Math.min(b.max, Math.max(b.min, parsed)));
                            }
                          }}
                          onBlur={(e) => {
                            // Cellule laissée vide : resynchroniser l'affichage avec le
                            // modèle (qui a gardé l'ancienne valeur, voir onChange).
                            if (e.target.value.trim() === "") e.target.value = String(v);
                          }}
                          className="h-9 w-full min-w-16 rounded-md border border-input bg-background text-center font-mono text-sm font-medium tabular-nums outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
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

      <B2bContractsCard />

      {disabledCount > 0 && (
        <p className="mt-3 text-xs font-medium text-warning">
          {disabledCount === 1
            ? "1 activité est exclue"
            : `${disabledCount} activités sont exclues`}{" "}
          des calculs — toutes les vues (synthèse, résultat, trésorerie, scénarios, projection,
          statuts) et les exports n'en tiennent plus compte. Recochez pour les réintégrer.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        Capacité solo : {h.capacity} h facturables/mois. « ⚠ » signale un mois au-delà de la
        capacité — lisser les volumes, augmenter les tarifs des nouveaux contrats ({h.hourlyB2B + 2}
        -{h.hourlyB2B + 4} €/h) ou préparer le palier d'embauche.
      </p>
    </section>
  );
}

/** Petit champ numérique compact pour une cellule de contrat. */
function CNum({
  label,
  value,
  onChange,
  step = 1,
  width = "w-20",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  width?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(",", "."));
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        className={cn(
          "h-8 rounded-md border border-input bg-background px-2 text-right text-sm font-mono tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          width,
        )}
      />
    </label>
  );
}

/** Portefeuille de contrats B2B hétérogènes (option avancée, parité préservée à OFF). */
function B2bContractsCard() {
  const { hypotheses: h, setField } = useSimulator();
  const enabled = h.b2bContractsEnabled;
  const contracts = h.b2bContracts;
  const setContracts = (next: B2bContract[]) => setField("b2bContracts", next);
  const add = () =>
    setContracts([
      ...contracts,
      { label: "", visitsPerWeek: 2, hoursPerVisit: 1, rate: h.hourlyB2B, sites: 1, startMonth: 0 },
    ]);
  const upd = (i: number, patch: Partial<B2bContract>) =>
    setContracts(contracts.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const del = (i: number) => setContracts(contracts.filter((_, j) => j !== i));

  return (
    <Card className="mt-4">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={enabled}
              onCheckedChange={(v) => setField("b2bContractsEnabled", v === true)}
            />
            <span className="font-display text-sm font-semibold">
              Portefeuille de contrats B2B sur mesure
            </span>
            <InfoDot text="Activez-le pour décrire chaque client B2B séparément (ex. un client 5 passages/sem × 1 h, un autre 2 passages/sem × 2 h). Le CA et surtout les HEURES B2B deviennent la somme exacte de vos contrats, au lieu d'un « site moyen ». Désactivé (par défaut), le modèle reste en parité stricte avec le prévisionnel certifié." />
          </label>
          {enabled && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
              mode avancé
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {enabled
            ? "Le CA et les heures B2B viennent désormais de la somme de vos contrats (la ligne « Sites B2B » ci-dessus est ignorée). Chaque contrat est actif à partir de son mois de début. Note : Scénarios et Sensibilité restent calculés sur l'agrégat (approximation en mode avancé)."
            : "Par défaut : un seul « site moyen » (réglages des Hypothèses). Activez pour saisir des contrats clients hétérogènes."}
        </p>

        {enabled && (
          <div className="space-y-2">
            {contracts.length === 0 && (
              <p className="text-xs italic text-muted-foreground">
                Aucun contrat — ajoutez vos clients ci-dessous.
              </p>
            )}
            {contracts.map((c, i) => (
              <div
                key={i}
                className="flex flex-wrap items-end gap-3 rounded-md border border-border p-2.5"
              >
                <label className="flex min-w-40 flex-1 flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">Client / contrat</span>
                  <input
                    type="text"
                    value={c.label}
                    placeholder={`Contrat ${i + 1}`}
                    onChange={(e) => upd(i, { label: e.target.value.slice(0, 80) })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <CNum
                  label="Passages/sem"
                  value={c.visitsPerWeek}
                  step={0.5}
                  onChange={(v) => upd(i, { visitsPerWeek: v })}
                />
                <CNum
                  label="Heures/passage"
                  value={c.hoursPerVisit}
                  step={0.25}
                  onChange={(v) => upd(i, { hoursPerVisit: v })}
                />
                <CNum
                  label="Taux €/h"
                  value={c.rate}
                  step={1}
                  onChange={(v) => upd(i, { rate: v })}
                />
                <CNum
                  label="Nb sites"
                  value={c.sites}
                  step={1}
                  onChange={(v) => upd(i, { sites: v })}
                />
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">Mois de début</span>
                  <select
                    value={c.startMonth}
                    onChange={(e) => upd(i, { startMonth: Number(e.target.value) })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => del(i)}
                  aria-label={`Supprimer le contrat ${i + 1}`}
                  className="mb-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={add}>
              <Plus className="h-3.5 w-3.5" /> Ajouter un contrat
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
