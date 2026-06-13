import { useState } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { euro, MONTHS, OFFICIAL, type Hypotheses } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { SectionHead } from "./results";
import { InfoTerm } from "./info-term";

/* ------------------------------------------------------------------ */
/* Plan d'activité en MODE RÉEL DÉTAILLÉ : chaque segment se remplit    */
/* client par client (volume mensuel, heures, tarif, mois de début).   */
/* Le calcul « moyenne » du prévisionnel reste accessible via le bouton */
/* « Préréglage officiel » mais n'est pas éditable ici.                 */
/* ------------------------------------------------------------------ */

type Col = { key: string; label: string; step: number };
type SegKey = "b2b" | "glass" | "airbnb" | "private";
type SegmentDef = {
  title: string;
  enabledKey: "enabledB2b" | "enabledGlass" | "enabledAirbnb" | "enabledPrivate";
  flagKey:
    | "b2bContractsEnabled"
    | "glassContractsEnabled"
    | "airbnbContractsEnabled"
    | "privateContractsEnabled";
  arrKey: "b2bContracts" | "glassContracts" | "airbnbContracts" | "privateContracts";
  caKey: "b2b" | "glass" | "airbnb" | "private";
  cols: Col[];
  unitLabel: string;
  newItem: (h: Hypotheses) => Record<string, number | string>;
};

const SEGMENTS: Record<SegKey, SegmentDef> = {
  b2b: {
    title: "B2B récurrent (contrats d'entretien)",
    enabledKey: "enabledB2b",
    flagKey: "b2bContractsEnabled",
    arrKey: "b2bContracts",
    caKey: "b2b",
    unitLabel: "client",
    cols: [
      { key: "visitsPerWeek", label: "Passages/sem", step: 0.5 },
      { key: "hoursPerVisit", label: "Heures/passage", step: 0.25 },
      { key: "rate", label: "Taux €/h", step: 1 },
      { key: "sites", label: "Nb sites", step: 1 },
    ],
    newItem: (h) => ({
      label: "",
      visitsPerWeek: 2,
      hoursPerVisit: 1,
      rate: h.hourlyB2B,
      sites: 1,
      startMonth: 0,
    }),
  },
  glass: {
    title: "Vitrerie",
    enabledKey: "enabledGlass",
    flagKey: "glassContractsEnabled",
    arrKey: "glassContracts",
    caKey: "glass",
    unitLabel: "client/chantier",
    cols: [
      { key: "perMonth", label: "Interventions/mois", step: 1 },
      { key: "hoursEach", label: "Heures/interv.", step: 0.25 },
      { key: "rate", label: "Taux €/h", step: 1 },
    ],
    newItem: (h) => ({ label: "", perMonth: 1, hoursEach: 2, rate: h.glassRate, startMonth: 0 }),
  },
  airbnb: {
    title: "Airbnb (rotations courte durée)",
    enabledKey: "enabledAirbnb",
    flagKey: "airbnbContractsEnabled",
    arrKey: "airbnbContracts",
    caKey: "airbnb",
    unitLabel: "logement",
    cols: [
      { key: "perMonth", label: "Rotations/mois", step: 1 },
      { key: "hoursEach", label: "Heures/rotation", step: 0.25 },
      { key: "price", label: "Prix €/rotation", step: 1 },
    ],
    newItem: (h) => ({
      label: "",
      perMonth: 1,
      hoursEach: 2.5,
      price: h.airbnbPrice,
      startMonth: 0,
    }),
  },
  private: {
    title: "Particuliers (ménage à domicile)",
    enabledKey: "enabledPrivate",
    flagKey: "privateContractsEnabled",
    arrKey: "privateContracts",
    caKey: "private",
    unitLabel: "client",
    cols: [
      { key: "perMonth", label: "Prestations/mois", step: 1 },
      { key: "hoursEach", label: "Heures/prestation", step: 0.25 },
      { key: "rate", label: "Taux €/h", step: 1 },
    ],
    newItem: (h) => ({ label: "", perMonth: 1, hoursEach: 3, rate: h.privateRate, startMonth: 0 }),
  },
};

const SEG_ORDER: SegKey[] = ["b2b", "glass", "airbnb", "private"];

/** Petit champ numérique compact pour une cellule de contrat. */
function CNum({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
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
        className="h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-sm font-mono tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}

function SegmentCard({ seg }: { seg: SegKey }) {
  const def = SEGMENTS[seg];
  const { hypotheses: h, result, setField } = useSimulator();
  const enabled = h[def.enabledKey];
  const contracts = h[def.arrKey] as unknown as Record<string, number | string>[];
  const [bulkN, setBulkN] = useState(1);
  const [bulkMonth, setBulkMonth] = useState(0);

  if (!enabled) return null;

  const setContracts = (next: Record<string, number | string>[]) =>
    setField(def.arrKey, next as never);
  const addOne = () => setContracts([...contracts, def.newItem(h)]);
  const addBulk = () => {
    const items = Array.from({ length: Math.max(1, Math.min(24, Math.round(bulkN))) }, () => ({
      ...def.newItem(h),
      startMonth: bulkMonth,
    }));
    setContracts([...contracts, ...items]);
  };
  const upd = (i: number, key: string, val: number | string) =>
    setContracts(contracts.map((c, j) => (j === i ? { ...c, [key]: val } : c)));
  const del = (i: number) => setContracts(contracts.filter((_, j) => j !== i));

  const annualCa = result.months.reduce((s, m) => s + (m[def.caKey] as number), 0);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-primary">{def.title}</h3>
          <span className="font-mono text-sm font-semibold tabular-nums">
            CA an 1 : {euro(annualCa)}
          </span>
        </div>

        {contracts.length === 0 && (
          <p className="text-xs italic text-muted-foreground">
            Aucun {def.unitLabel} — ajoutez vos clients réels ci-dessous.
          </p>
        )}

        {contracts.map((c, i) => (
          <div
            key={i}
            className="flex flex-wrap items-end gap-3 rounded-md border border-border p-2.5"
          >
            <label className="flex min-w-44 flex-1 flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Nom du {def.unitLabel}</span>
              <input
                type="text"
                value={String(c.label ?? "")}
                placeholder={`${def.title.split(" ")[0]} ${i + 1}`}
                onChange={(e) => upd(i, "label", e.target.value.slice(0, 80))}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {def.cols.map((col) => (
              <CNum
                key={col.key}
                label={col.label}
                step={col.step}
                value={Number(c[col.key] ?? 0)}
                onChange={(v) => upd(i, col.key, v)}
              />
            ))}
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Mois de début</span>
              <select
                value={Number(c.startMonth ?? 0)}
                onChange={(e) => upd(i, "startMonth", Number(e.target.value))}
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
              aria-label={`Supprimer ${def.unitLabel} ${i + 1}`}
              className="mb-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addOne}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un {def.unitLabel}
          </Button>
          <span className="text-[11px] text-muted-foreground">ou</span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            ajouter
            <input
              type="number"
              min={1}
              max={24}
              value={bulkN}
              onChange={(e) => setBulkN(Number(e.target.value) || 1)}
              className="h-7 w-14 rounded-md border border-input bg-background px-1 text-center text-sm font-mono"
              aria-label="Nombre de clients à ajouter"
            />
            clients dès
            <select
              value={bulkMonth}
              onChange={(e) => setBulkMonth(Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-1 text-sm"
              aria-label="Mois de début groupé"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addBulk}>
              <Plus className="h-3 w-3" /> ajouter
            </Button>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivityPlan() {
  const { hypotheses: h, result, setField, applyPreset } = useSimulator();

  const detailMode =
    h.b2bContractsEnabled ||
    h.glassContractsEnabled ||
    h.airbnbContractsEnabled ||
    h.privateContractsEnabled;

  const enterDetail = () => {
    setField("b2bContractsEnabled", true);
    setField("glassContractsEnabled", true);
    setField("airbnbContractsEnabled", true);
    setField("privateContractsEnabled", true);
  };

  const enabledSegs = SEG_ORDER.filter((s) => h[SEGMENTS[s].enabledKey]);

  return (
    <section className="space-y-5">
      <SectionHead
        title="Plan d'activité · 12 mois"
        desc="Septembre 2026 → août 2027. Plan RÉEL détaillé : décrivez vos vrais clients segment par segment (volume mensuel, heures, tarif, mois de début). Aucune moyenne — chaque contrat est compté à sa juste charge."
      />

      {!detailMode ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">
                Prévisionnel officiel (calcul moyen) chargé.
              </p>
              <p className="mt-1 text-muted-foreground">
                Les chiffres affichés (net réel {euro(result.realNet)}) viennent du « site moyen »
                du prévisionnel certifié — non éditable ici. Passez en plan réel détaillé pour
                saisir vos vrais clients.
              </p>
            </div>
            <Button onClick={enterDetail} className="gap-2">
              <Plus className="h-4 w-4" /> Passer en plan réel détaillé
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sélection des segments travaillés */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                Segments travaillés :
              </span>
              {SEG_ORDER.map((s) => {
                const def = SEGMENTS[s];
                return (
                  <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={h[def.enabledKey]}
                      onCheckedChange={(v) => setField(def.enabledKey, v === true)}
                    />
                    {def.title.split(" ")[0]}
                  </label>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto gap-1.5 text-xs text-muted-foreground"
                onClick={() => applyPreset(OFFICIAL)}
              >
                Préréglage officiel (moyenne)
              </Button>
            </CardContent>
          </Card>

          {enabledSegs.map((s) => (
            <SegmentCard key={s} seg={s} />
          ))}

          {enabledSegs.length === 0 && (
            <p className="text-sm italic text-muted-foreground">
              Aucun segment sélectionné — cochez au moins une activité ci-dessus.
            </p>
          )}

          {/* Note explicative : différence réel vs moyenne */}
          <Card className="border-dashed">
            <CardContent className="space-y-1.5 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-3.5 w-3.5" /> Pourquoi le réel diffère de la moyenne ?
              </p>
              <p>
                Le <strong>plan réel</strong> additionne chaque contrat avec ses propres valeurs
                (Σ&nbsp;clients × passages × heures × tarif). La <strong>moyenne</strong>{" "}
                (préréglage officiel) multiplie un profil unique par un nombre de sites : elle
                calcule «&nbsp;le produit des moyennes&nbsp;», pas «&nbsp;la somme des produits
                réels&nbsp;».
              </p>
              <p>
                Exemple : client A 5×1&nbsp;h = 5&nbsp;h, client B 2×2&nbsp;h = 4&nbsp;h →{" "}
                <strong>9&nbsp;h réelles</strong>. En moyenne (3,5 passages × 1,5&nbsp;h) × 2 ={" "}
                <strong>10,5&nbsp;h</strong> → surestimation. Dès que vos clients diffèrent (heures,
                fréquence, tarif), seul le plan réel est exact. Ce n'est donc pas une simple
                moyenne.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Synthèse mensuelle (résultat calculé) */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <caption className="sr-only">Résultat mensuel calculé du plan d'activité</caption>
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-card text-left font-medium py-2.5 pl-4 pr-3"
                >
                  Résultat
                </th>
                {MONTHS.map((mois) => (
                  <th key={mois} scope="col" className="text-right font-medium py-2.5 px-2">
                    {mois}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <th scope="row" className="sticky left-0 z-10 bg-muted/40 text-left py-2 pl-4 pr-3">
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
                  <InfoTerm term="Capacité solo">Heures facturées</InfoTerm>
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

      <p className="text-xs text-muted-foreground leading-relaxed">
        Capacité solo : {h.capacity} h facturables/mois. « ⚠ » signale un mois au-delà de la
        capacité — lisser les volumes, augmenter les tarifs des nouveaux contrats ou préparer le
        palier d'embauche.
      </p>
    </section>
  );
}
