import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Info,
  Landmark,
  Menu,
  Moon,
  PiggyBank,
  RotateCcw,
  Save,
  Share2,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  activePresetId,
  boundsOf,
  CAPACITY_CRITICAL,
  CAPACITY_WARN,
  CFE_YEAR2,
  euro,
  fmtK,
  legalStatuses,
  MONTHS,
  OFFICIAL,
  percent,
  PRESETS,
  safePercent,
  safeRatio,
  type Hypotheses,
} from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

const NAV = [
  ["synthese", "Synthèse", BarChart3],
  ["hypotheses", "Hypothèses", SlidersHorizontal],
  ["activite", "Plan d’activité", FileSpreadsheet],
  ["resultat", "Compte de résultat", Calculator],
  ["tresorerie", "Trésorerie", PiggyBank],
  ["scenarios", "Scénarios", TrendingUp],
  ["statuts", "Statuts juridiques", Landmark],
  ["projection", "Projection 5 ans", BriefcaseBusiness],
  ["demarrage", "Démarrage", ClipboardCheck],
  ["dictionnaire", "Dictionnaire", BookOpen],
] as const;
type Page = (typeof NAV)[number][0];
const TITLES = Object.fromEntries(NAV.map(([id, title]) => [id, title])) as Record<Page, string>;
const PAGE_IDS = NAV.map(([id]) => id) as readonly Page[];

const smoothScrollTop = () => {
  if (typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
};

/* ------------------------------------------------------------------ */
/* Briques d'interface                                                 */
/* ------------------------------------------------------------------ */

/** Tooltip recharts aux couleurs du thème (le rendu par défaut est illisible en sombre). */
function ChartTip({
  active,
  payload,
  label,
  formatter = (v: number) => euro(v),
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label && <p className="mb-1 font-bold">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: entry.color }} />
          {entry.name} : <b>{formatter(Number(entry.value))}</b>
        </p>
      ))}
    </div>
  );
}

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };

function InfoDot({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Définition : ${text}`}
          className="inline-flex align-middle text-muted-foreground hover:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-xs leading-5">{text}</TooltipContent>
    </Tooltip>
  );
}

function Metric({
  label,
  value,
  detail,
  progress,
  good,
  info,
}: {
  label: string;
  value: string;
  detail: string;
  progress?: number;
  /** true = favorable, false = à surveiller, absent = purement informatif (icône neutre). */
  good?: boolean;
  info?: string;
}) {
  return (
    <Card className="verdict-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label} {info && <InfoDot text={info} />}
          </p>
          {good === undefined ? (
            <Info className="size-4 shrink-0 text-muted-foreground" aria-label="information" />
          ) : good ? (
            <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="favorable" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-warning" aria-label="à surveiller" />
          )}
        </div>
        <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 min-h-8 text-xs text-muted-foreground">{detail}</p>
        {progress !== undefined && Number.isFinite(progress) && (
          <Progress className="mt-3" value={Math.min(100, Math.max(0, progress))} />
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-5">
      <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-primary">{eyebrow}</p>
      <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/**
 * Champ numérique robuste : état brouillon en chaîne (on peut vider le champ ou taper
 * une valeur intermédiaire sans déclencher de recalcul faux), virgule française
 * acceptée, validation et clamp aux bornes du modèle au blur/Entrée.
 */
function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  info,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  info?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  // Si la valeur du modèle change pendant que le champ n'a pas le focus (preset,
  // réinitialisation, scénario chargé), on abandonne le brouillon pour l'afficher.
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) setDraft(null);
  }, [value]);
  const shown = draft ?? String(Math.round(value * 10000) / 10000).replace(".", ",");
  const commit = (raw: string) => {
    const parsed = Number(raw.replace(",", "."));
    if (raw.trim() !== "" && Number.isFinite(parsed)) {
      const lo = min ?? -Infinity;
      const hi = max ?? Infinity;
      onChange(Math.min(hi, Math.max(lo, parsed)));
    }
    setDraft(null);
  };
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label} {info && <InfoDot text={info} />}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          value={shown}
          onChange={(e) => {
            setDraft(e.target.value);
            const parsed = Number(e.target.value.replace(",", "."));
            if (e.target.value.trim() !== "" && Number.isFinite(parsed)) {
              const lo = min ?? -Infinity;
              const hi = max ?? Infinity;
              if (parsed >= lo && parsed <= hi) onChange(parsed);
            }
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          }}
          className="pr-12 font-medium tabular-nums"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-gold bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-display text-base font-bold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

/** Champ en pourcentage : affiche ×100, renvoie /100, bornes du modèle converties. */
function PercentField({
  label,
  field,
  value,
  onChange,
  info,
}: {
  label: string;
  field: keyof Hypotheses;
  value: number;
  onChange: (v: number) => void;
  info?: string;
}) {
  const bounds = boundsOf(field);
  return (
    <NumberField
      label={label}
      value={Math.round(value * 1000) / 10}
      onChange={(v) => onChange(v / 100)}
      suffix="%"
      min={(bounds?.min ?? 0) * 100}
      max={(bounds?.max ?? 1) * 100}
      info={info}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function Summary() {
  const { result, hypotheses: h } = useSimulator();
  const microOk = result.revenue <= h.microCeiling;
  const occupancy = result.maxOccupancy;
  const viable = result.fundable && result.targetMonth !== null;
  return (
    <>
      <SectionTitle
        eyebrow="Tableau de bord"
        title="Le modèle est-il viable ?"
        text="Une lecture immédiate de la rentabilité, du besoin de financement et de la capacité opérationnelle."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Metric
          label="Net réel année 1"
          value={euro(result.realNet)}
          detail={`${safePercent(result.realNet, result.revenue)} du chiffre d’affaires`}
          progress={safeRatio(result.realNet, result.revenue) * 100}
          good={result.realNet > 0}
          info="Somme des contributions par activité, moins les charges fixes et le matériel initial — la même définition que l'onglet Résultat du prévisionnel Excel."
        />
        <Metric
          label={`Objectif ${euro(h.target)}`}
          value={result.targetMonth ?? "Non atteint"}
          detail={
            result.targetMonth
              ? `Premier mois au-dessus de l’objectif (${result.monthsAboveTarget} mois sur 12)`
              : "Ajustez le plan d’activité ou les tarifs"
          }
          progress={result.targetMonth ? 100 : 25}
          good={!!result.targetMonth}
        />
        <Metric
          label="Net de croisière"
          value={euro(result.cruiseNet)}
          detail="Moyenne de juin à août 2027, saisonnalité incluse"
          progress={safeRatio(result.cruiseNet, h.target) * 100}
          good={result.cruiseNet >= h.target}
        />
        <Metric
          label="Point bas"
          value={euro(result.lowCash)}
          detail={`${result.lowCashMonth} · apport ${result.fundable ? "suffisant" : "insuffisant"}`}
          progress={result.fundable ? 100 : 20}
          good={result.fundable}
          info="Trésorerie la plus basse de l'année. Tant qu'elle reste positive, l'apport couvre le besoin de fonds de roulement."
        />
        <Metric
          label="Occupation au pic"
          value={percent(occupancy)}
          detail={`${result.peakHours} h sur ${h.capacity} h facturables`}
          progress={occupancy * 100}
          good={occupancy <= CAPACITY_CRITICAL}
        />
        <Metric
          label="Statut micro / TVA"
          value={microOk ? "Micro OK" : "Plafond dépassé"}
          detail={`${euro(result.revenue)} de CA · ${
            result.revenue > h.vatCeiling ? "TVA à facturer" : "franchise TVA"
          }`}
          progress={safeRatio(result.revenue, h.microCeiling) * 100}
          good={microOk}
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,.65fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display">Chiffre d’affaires mensuel par activité</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="h-[390px]"
              role="img"
              aria-label={`Chiffre d'affaires mensuel empilé par activité avec le net de gestion en courbe ; CA année 1 ${euro(result.revenue)}, objectif ${euro(h.target)} par mois.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={result.months}
                  margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tick={AXIS_TICK}
                    interval="preserveStartEnd"
                    angle={-20}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis tickFormatter={fmtK} tick={AXIS_TICK} />
                  <ChartTooltip content={<ChartTip />} />
                  <Legend />
                  <Bar dataKey="b2b" name="B2B récurrent" stackId="ca" fill="var(--chart-b2b)" />
                  <Bar dataKey="glass" name="Vitrerie" stackId="ca" fill="var(--chart-glass)" />
                  <Bar dataKey="airbnb" name="Airbnb" stackId="ca" fill="var(--chart-airbnb)" />
                  <Bar
                    dataKey="private"
                    name="Particuliers"
                    stackId="ca"
                    fill="var(--chart-private)"
                  />
                  <Line
                    type="monotone"
                    dataKey="netGestion"
                    name="Net de gestion"
                    stroke="var(--chart-net)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <ReferenceLine
                    y={h.target}
                    stroke="var(--warning)"
                    strokeDasharray="7 5"
                    label={{
                      value: `Objectif ${euro(h.target)}`,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: "var(--warning)",
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Card className={`border-l-4 ${viable ? "border-l-success" : "border-l-destructive"}`}>
            <CardContent className="p-5">
              <p
                className={`text-xs font-bold uppercase ${viable ? "text-success" : "text-destructive"}`}
              >
                Verdict
              </p>
              <p className="mt-2 font-display text-xl font-bold">
                {viable
                  ? "Démarrage finançable"
                  : result.fundable
                    ? "Objectif non atteint"
                    : "Apport insuffisant"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {viable &&
                  `L’apport couvre le point bas (${euro(result.lowCash)}) et l’objectif est atteint en ${result.targetMonth?.toLowerCase()}.`}
                {!result.fundable &&
                  `La trésorerie descend à ${euro(result.lowCash)} : il faut porter l’apport à au moins ${euro(result.minimumContribution)} ou revoir le plan.`}
                {result.fundable &&
                  !result.targetMonth &&
                  `La trésorerie tient, mais aucun mois n’atteint ${euro(h.target)} nets : renforcez les volumes ou les tarifs.`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase text-primary">Capital recommandé</p>
              <p className="mt-2 font-display text-2xl font-bold">
                {euro(result.recommendedContribution)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Apport minimal {euro(result.minimumContribution)} + 30 % de marge de sécurité.
              </p>
            </CardContent>
          </Card>
          {occupancy > CAPACITY_WARN && (
            <Card
              className={`border-l-4 ${occupancy > CAPACITY_CRITICAL ? "border-l-destructive" : "border-l-warning"}`}
            >
              <CardContent className="p-5">
                <p className="font-bold">
                  {occupancy > CAPACITY_CRITICAL ? "Capacité saturée" : "Capacité sous tension"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {occupancy > CAPACITY_CRITICAL
                    ? `Au-delà de ${percent(CAPACITY_CRITICAL)} durable : préparer l’embauche et la bascule en société, en plus des nouveaux contrats à ${h.hourlyB2B + 2}-${h.hourlyB2B + 4} €/h.`
                    : `Au-delà de ${percent(CAPACITY_WARN)} : proposer les nouveaux contrats entre ${h.hourlyB2B + 2} et ${h.hourlyB2B + 4} €/h — les clients existants conservent leur tarif.`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function HypothesesPage() {
  const { hypotheses: h, setField, applyPreset } = useSimulator();
  const preset = activePresetId(h);
  const numeric = (key: keyof Hypotheses) => (v: number) => setField(key, v as never);
  const acreId = useId();
  const vflId = useId();
  const bounds = (key: keyof Hypotheses) => boundsOf(key) ?? { min: 0, max: Infinity };
  return (
    <>
      <SectionTitle
        eyebrow="Variables du modèle"
        title="Hypothèses de simulation"
        text="Chaque changement recalcule instantanément les dix vues du prévisionnel."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            variant={preset === p.id ? "default" : "outline"}
            onClick={() => {
              applyPreset(p.hypotheses);
              toast.success(`Préréglage « ${p.name} » appliqué`);
            }}
          >
            {preset === p.id && <Check className="size-4" />}
            {p.name}
          </Button>
        ))}
        {preset === null && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
            hypothèses personnalisées
          </span>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            applyPreset(OFFICIAL);
            toast.success("Hypothèses réinitialisées (préréglage officiel)");
          }}
        >
          <RotateCcw className="size-4" />
          Réinitialiser
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <FieldGroup title="Tarifs & durées">
          <NumberField
            label="Taux B2B standard"
            value={h.hourlyB2B}
            onChange={numeric("hourlyB2B")}
            suffix="€/h"
            min={bounds("hourlyB2B").min}
            max={bounds("hourlyB2B").max}
            info="Tarif horaire de référence des contrats B2B mensuels. Les contrats annuels bénéficient de la remise ci-dessous."
          />
          <PercentField
            label="Part contrats annuels"
            field="annualShare"
            value={h.annualShare}
            onChange={numeric("annualShare")}
          />
          <PercentField
            label="Remise annuelle"
            field="annualDiscount"
            value={h.annualDiscount}
            onChange={numeric("annualDiscount")}
            info="Remise consentie sur les contrats annuels à tacite reconduction (6,7 % ≈ 28 €/h au lieu de 30)."
          />
          <NumberField
            label="Passages / semaine"
            value={h.visitsPerWeek}
            onChange={numeric("visitsPerWeek")}
            min={bounds("visitsPerWeek").min}
            max={bounds("visitsPerWeek").max}
          />
          <NumberField
            label="Heures / passage"
            value={h.hoursPerVisit}
            onChange={numeric("hoursPerVisit")}
            suffix="h"
            min={bounds("hoursPerVisit").min}
            max={bounds("hoursPerVisit").max}
          />
          <NumberField
            label="Vitrerie"
            value={h.glassRate}
            onChange={numeric("glassRate")}
            suffix="€/h"
            min={bounds("glassRate").min}
            max={bounds("glassRate").max}
          />
          <NumberField
            label="Rotation Airbnb"
            value={h.airbnbPrice}
            onChange={numeric("airbnbPrice")}
            suffix="€"
            min={bounds("airbnbPrice").min}
            max={bounds("airbnbPrice").max}
          />
          <NumberField
            label="Particuliers"
            value={h.privateRate}
            onChange={numeric("privateRate")}
            suffix="€/h"
            min={bounds("privateRate").min}
            max={bounds("privateRate").max}
          />
        </FieldGroup>
        <FieldGroup title="Prélèvements micro">
          <PercentField
            label="Cotisations sociales"
            field="socialRate"
            value={h.socialRate}
            onChange={numeric("socialRate")}
            info="21,2 % du CA encaissé pour les services BIC en 2026."
          />
          <PercentField
            label="Taux ACRE"
            field="acreRate"
            value={h.acreRate}
            onChange={numeric("acreRate")}
            info="15,9 % pour les créations postérieures au 01/07/2026 — réservé aux adresses en QPV (à vérifier sur sig.ville.gouv.fr)."
          />
          <PercentField
            label="TMI"
            field="tmi"
            value={h.tmi}
            onChange={numeric("tmi")}
            info="Tranche marginale d'imposition du foyer — utilisée si le versement libératoire est désactivé."
          />
          <div className="flex items-center gap-3">
            <Switch id={acreId} checked={h.acre} onCheckedChange={(v) => setField("acre", v)} />
            <Label htmlFor={acreId}>Activer l’ACRE</Label>
            <InfoDot text="Hypothèse à confirmer : l'ACRE n'est accessible qu'avec une adresse en quartier prioritaire (QPV). Le taux réduit est appliqué sur tout l'exercice, comme dans le prévisionnel Excel." />
          </div>
          <div className="flex items-center gap-3">
            <Switch id={vflId} checked={h.vfl} onCheckedChange={(v) => setField("vfl", v)} />
            <Label htmlFor={vflId}>Versement libératoire</Label>
            <InfoDot text="Impôt payé au fil de l'eau (1,7 % du CA). Sinon, impôt au barème sur 50 % du CA (abattement micro-BIC services), visible dans le compte de résultat." />
          </div>
        </FieldGroup>
        <FieldGroup title="Charges">
          <PercentField
            label="Produits"
            field="productsRate"
            value={h.productsRate}
            onChange={numeric("productsRate")}
          />
          <PercentField
            label="Déplacements"
            field="travelRate"
            value={h.travelRate}
            onChange={numeric("travelRate")}
          />
          <PercentField
            label="Impayés B2B"
            field="unpaidRate"
            value={h.unpaidRate}
            onChange={numeric("unpaidRate")}
            info="Part du CA B2B jamais encaissée (préréglage terrain : 1,5 %)."
          />
          <NumberField
            label="Fixes mensuelles"
            value={h.fixedMonthly}
            onChange={numeric("fixedMonthly")}
            suffix="€"
            min={bounds("fixedMonthly").min}
            max={bounds("fixedMonthly").max}
            info="RC pro 15 + véhicule 12 + téléphone 15 + logiciel 25 + banque 8 = 75 €/mois dans le préréglage officiel."
          />
          <NumberField
            label="Renouvellement matériel"
            value={h.renewalMonthly}
            onChange={numeric("renewalMonthly")}
            suffix="€/mois"
            min={bounds("renewalMonthly").min}
            max={bounds("renewalMonthly").max}
          />
        </FieldGroup>
        <FieldGroup title="Capital, capacité & seuils">
          <NumberField
            label="Apport"
            value={h.contribution}
            onChange={numeric("contribution")}
            suffix="€"
            min={bounds("contribution").min}
            max={bounds("contribution").max}
          />
          <NumberField
            label="Matériel initial"
            value={h.capex}
            onChange={numeric("capex")}
            suffix="€"
            min={bounds("capex").min}
            max={bounds("capex").max}
            info="Investissement de départ (aspirateur pro, monobrosse, consommables) payé au mois 1."
          />
          <PercentField
            label="B2B encaissé à 30 jours"
            field="delayedShare"
            value={h.delayedShare}
            onChange={numeric("delayedShare")}
            info="Part du CA B2B + vitrerie encaissée le mois suivant. Airbnb et particuliers paient comptant."
          />
          <NumberField
            label="Objectif net mensuel"
            value={h.target}
            onChange={numeric("target")}
            suffix="€"
            min={bounds("target").min}
            max={bounds("target").max}
          />
          <NumberField
            label="Capacité solo"
            value={h.capacity}
            onChange={numeric("capacity")}
            suffix="h/mois"
            min={bounds("capacity").min}
            max={bounds("capacity").max}
          />
          <NumberField
            label="Plafond micro"
            value={h.microCeiling}
            onChange={numeric("microCeiling")}
            suffix="€"
            min={bounds("microCeiling").min}
            max={bounds("microCeiling").max}
          />
          <NumberField
            label="Seuil franchise TVA"
            value={h.vatCeiling}
            onChange={numeric("vatCeiling")}
            suffix="€"
            min={bounds("vatCeiling").min}
            max={bounds("vatCeiling").max}
            info="37 500 € en 2026 (seuil majoré 41 250 € toléré une année). Dépassement attendu dès l'année 2 — neutre pour les clients B2B."
          />
        </FieldGroup>
      </div>
    </>
  );
}

function Activity() {
  const { hypotheses: h, result, setMonthValue } = useSimulator();
  const rows = [
    ["sites", "Sites B2B"],
    ["seasonality", "Saisonnalité"],
    ["glassJobs", "Vitrerie"],
    ["airbnb", "Airbnb"],
    ["privateJobs", "Particuliers"],
  ] as const;
  return (
    <>
      <SectionTitle
        eyebrow="Volumes commerciaux"
        title="Plan d’activité · 12 mois"
        text="Pilotez les contrats et interventions. Le chiffre d’affaires, les heures et la charge se recalculent en direct."
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1050px]">
            <thead>
              <tr>
                <th>Série</th>
                {MONTHS.map((m) => (
                  <th key={m}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, label]) => (
                <tr key={key}>
                  <th>{label}</th>
                  {h[key].map((v, i) => (
                    <td key={i}>
                      <Input
                        aria-label={`${label} ${MONTHS[i]}`}
                        type="number"
                        inputMode="decimal"
                        min={boundsOf(key)?.min}
                        max={boundsOf(key)?.max}
                        step={key === "seasonality" ? 0.05 : 1}
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
                        className="h-9 min-w-16 text-center"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="calculated">
                <th>CA mensuel</th>
                {result.months.map((m) => (
                  <td key={m.month}>{euro(m.ca)}</td>
                ))}
              </tr>
              <tr className="calculated">
                <th>Net de gestion</th>
                {result.months.map((m) => (
                  <td key={m.month}>{euro(m.netGestion)}</td>
                ))}
              </tr>
              <tr className="calculated">
                <th>Heures</th>
                {result.months.map((m) => (
                  <td key={m.month} className={m.overloaded ? "font-bold text-destructive" : ""}>
                    {m.hours} h{m.overloaded && " ⚠ surcharge"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Capacité solo : {h.capacity} h facturables/mois. Une cellule « surcharge » signifie que le
        mois dépasse la capacité — lisser les volumes ou préparer le palier d’embauche.
      </p>
    </>
  );
}

function Profit() {
  const { result, hypotheses: h } = useSimulator();
  const totalLevies = result.byActivity.reduce((s, a) => s + a.cotisations + a.impot + a.cfp, 0);
  const totalVariable = result.byActivity.reduce((s, a) => s + a.produits + a.deplacements, 0);
  return (
    <>
      <SectionTitle
        eyebrow="Rentabilité"
        title="Compte de résultat analytique"
        text="Chaque activité porte ses prélèvements et ses charges variables — la même cascade que l'onglet Résultat du prévisionnel."
      />
      <div className="grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>Activité</th>
                    <th>CA</th>
                    <th>Cotisations</th>
                    <th>Impôt</th>
                    <th>CFP</th>
                    <th>Variables</th>
                    <th>Contribution</th>
                    <th>Marge</th>
                  </tr>
                </thead>
                <tbody>
                  {result.byActivity.map((a) => (
                    <tr key={a.key}>
                      <th>{a.label}</th>
                      <td>{euro(a.ca)}</td>
                      <td className="text-destructive">− {euro(a.cotisations)}</td>
                      <td className="text-destructive">− {euro(a.impot)}</td>
                      <td className="text-destructive">− {euro(a.cfp)}</td>
                      <td className="text-destructive">− {euro(a.produits + a.deplacements)}</td>
                      <td className="font-bold">{euro(a.contribution)}</td>
                      <td>{safePercent(a.contribution, a.ca)}</td>
                    </tr>
                  ))}
                  <tr className="calculated">
                    <th>Total activités</th>
                    <td>{euro(result.revenue)}</td>
                    <td className="text-destructive">
                      − {euro(result.byActivity.reduce((s, a) => s + a.cotisations, 0))}
                    </td>
                    <td className="text-destructive">
                      − {euro(result.byActivity.reduce((s, a) => s + a.impot, 0))}
                    </td>
                    <td className="text-destructive">
                      − {euro(result.byActivity.reduce((s, a) => s + a.cfp, 0))}
                    </td>
                    <td className="text-destructive">− {euro(totalVariable)}</td>
                    <td className="font-bold">{euro(result.totalContribution)}</td>
                    <td>{safePercent(result.totalContribution, result.revenue)}</td>
                  </tr>
                  <tr>
                    <th>Charges fixes (12 mois)</th>
                    <td colSpan={5}></td>
                    <td className="text-destructive">− {euro(result.fixedYear)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <th>Matériel initial</th>
                    <td colSpan={5}></td>
                    <td className="text-destructive">− {euro(h.capex)}</td>
                    <td></td>
                  </tr>
                  <tr className="total">
                    <th>NET RÉEL ANNÉE 1</th>
                    <td colSpan={5}></td>
                    <td>{euro(result.realNet)}</td>
                    <td>{safePercent(result.realNet, result.revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Metric
            label="Net mensuel moyen"
            value={euro(Math.round(result.realNet / 12))}
            detail="Après matériel initial"
            progress={safeRatio(result.realNet, result.revenue) * 100}
            good={result.realNet > 0}
          />
          <Metric
            label="Net de croisière"
            value={euro(result.cruiseNet)}
            detail="Moyenne juin–août 2027"
            progress={safeRatio(result.cruiseNet, h.target) * 100}
            good={result.cruiseNet >= h.target}
          />
          <Metric
            label="Prélèvements totaux"
            value={euro(totalLevies)}
            detail={`${safePercent(totalLevies, result.revenue)} du CA (cotisations + impôt + CFP)`}
            info="En micro-entreprise, les prélèvements sont proportionnels au CA encaissé : pas de CA, pas de cotisations."
          />
        </div>
      </div>
    </>
  );
}

function Cash() {
  const { result, hypotheses: h } = useSimulator();
  return (
    <>
      <SectionTitle
        eyebrow="Besoin en fonds de roulement"
        title="Trésorerie mensuelle"
        text={`${percent(h.delayedShare)} du B2B et de la vitrerie est encaissé à 30 jours ; Airbnb et particuliers paient comptant.`}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Point bas"
          value={euro(result.lowCash)}
          detail={result.lowCashMonth}
          good={result.fundable}
        />
        <Metric
          label="Apport minimal"
          value={euro(result.minimumContribution)}
          detail="Arrondi à la centaine supérieure"
          good={h.contribution >= result.minimumContribution}
        />
        <Metric
          label="Apport recommandé"
          value={euro(result.recommendedContribution)}
          detail="Marge de sécurité de 30 %"
          good={h.contribution >= result.recommendedContribution}
        />
        <Metric
          label="Créances fin d’année"
          value={euro(result.endReceivables)}
          detail="B2B + vitrerie d’août encaissés en septembre 2027"
          info="Le décalage d'encaissement crée un besoin de fonds de roulement permanent : ce montant vous est dû mais n'est pas encore en banque."
        />
      </div>
      <Card className="mt-5">
        <CardContent className="p-5">
          <div
            className="h-[400px]"
            role="img"
            aria-label={`Courbe de trésorerie sur 12 mois, point bas ${euro(result.lowCash)} en ${result.lowCashMonth}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.months}>
                <defs>
                  <linearGradient id="cashFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtK} tick={AXIS_TICK} />
                <ChartTooltip content={<ChartTip />} />
                <ReferenceLine
                  y={0}
                  stroke="var(--destructive)"
                  label={{
                    value: "Zéro",
                    position: "insideBottomRight",
                    fontSize: 10,
                    fill: "var(--destructive)",
                  }}
                />
                <Area
                  dataKey="cash"
                  name="Trésorerie"
                  stroke="var(--primary)"
                  fill="url(#cashFill)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Apport initial : {euro(h.contribution)} · Matériel au mois 1 : {euro(h.capex)} ·
            Prélèvements calculés sur l’encaissé, charges variables sur le facturé (comme le
            prévisionnel Excel).
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function Scenarios() {
  const { result, saved, activeScenario, saveScenario, loadScenario, deleteScenario } =
    useSimulator();
  const [name, setName] = useState("");
  const colors = ["var(--warning)", "var(--primary)", "var(--success)"];
  return (
    <>
      <SectionTitle
        eyebrow="Sensibilité"
        title="Comparer les scénarios"
        text="Choc de volumes (sites −35 %/+35 %, Airbnb et particuliers −40 %/+25 %, vitrerie −40 %/+40 %) et de prix (±5 %) — les formules de l'onglet Scénarios du prévisionnel."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <Card>
          <CardContent className="p-5">
            <div
              className="h-[360px]"
              role="img"
              aria-label={`Nets annuels par scénario : ${result.scenarios.map((s) => `${s.name} ${euro(s.net)}`).join(", ")}.`}
            >
              <ResponsiveContainer>
                <BarChart data={result.scenarios}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis tickFormatter={fmtK} tick={AXIS_TICK} />
                  <ChartTooltip content={<ChartTip />} />
                  <Bar dataKey="net" name="Net réel" radius={[5, 5, 0, 0]}>
                    {result.scenarios.map((_, i) => (
                      <Cell key={i} fill={colors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {result.scenarios.map((s, i) => (
                <div key={s.name} className="rounded-md border px-3 py-2 text-xs">
                  <p className="font-bold" style={{ color: colors[i] }}>
                    {s.name}
                  </p>
                  <p className="mt-1 text-muted-foreground">CA {euro(s.ca)}</p>
                  <p className="font-bold">{euro(s.net)} nets</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Méthode de l’onglet Scénarios du prévisionnel : net recalculé par arrondi global sur
              le CA — le réaliste peut différer de ±1 € du net réel détaillé de la Synthèse (
              {euro(result.realNet)}).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Scénarios personnalisés</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (saveScenario(name)) {
                  toast.success(`Scénario « ${name.trim()} » enregistré`);
                  setName("");
                }
              }}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Avec un salarié"
                aria-label="Nom du scénario à enregistrer"
              />
              <Button type="submit" size="icon" disabled={!name.trim()} aria-label="Enregistrer">
                <Save />
              </Button>
            </form>
            <div className="mt-4 space-y-2">
              {saved.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun scénario enregistré. Réglez vos hypothèses puis donnez-leur un nom pour les
                  retrouver ici.
                </p>
              )}
              {saved.map((s) => (
                <div key={s.name} className="flex items-center justify-between border-b py-2">
                  <Button
                    variant="link"
                    className="px-0"
                    onClick={() => {
                      loadScenario(s);
                      toast.success(`Scénario « ${s.name} » chargé`);
                    }}
                  >
                    {s.name}
                    {activeScenario === s.name && <span className="badge-success ml-2">actif</span>}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Supprimer ${s.name}`}>
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer « {s.name} » ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le scénario sera définitivement retiré de cet appareil.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteScenario(s.name);
                            toast.success(`Scénario « ${s.name} » supprimé`);
                          }}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Statuses() {
  const { hypotheses: h, result } = useSimulator();
  const statuses = legalStatuses(h, result.revenue);
  return (
    <>
      <SectionTitle
        eyebrow="Guide de choix"
        title="Quel statut juridique ?"
        text={`Net en poche annuel pour ${euro(result.revenue)} de CA — formules vérifiées cellule par cellule contre le comparateur juridique (audit du 12/06/2026) ; micro sans CFE l'année de création, EI, EURL et SASU en année type avec CFE de ${euro(CFE_YEAR2)}.`}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statuses.map((s, i) => (
          <Card key={s.id} className={i === 0 ? "border-primary" : ""}>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <span className="grid size-7 place-content-center rounded-full bg-secondary text-xs font-bold">
                  {i + 1}
                </span>
                {i === 0 && <span className="badge-success">Meilleur net</span>}
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{s.name}</h3>
              <p className="mt-2 text-2xl font-bold">{euro(s.value)}</p>
              <p className="text-xs text-muted-foreground">
                net en poche / an · {euro(s.monthly)} / mois
              </p>
              <div className="my-4 h-px bg-border" />
              <p className="text-sm text-muted-foreground">{s.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardContent className="grid gap-5 p-5 md:grid-cols-3">
          <div>
            <p className="font-bold">Pourquoi la micro gagne ici</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Avec {safePercent(h.productsRate + h.travelRate, 1)} de charges réelles seulement,
              l’abattement forfaitaire de 50 % est plus avantageux que la déduction au réel. La
              bascule en société se prépare vers 70 000 € de CA glissant.
            </p>
          </div>
          <div>
            <p className="font-bold">EI / EURL</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Deviennent pertinentes avec de vraies charges déductibles (salarié, véhicule dédié,
              local) ou pour piloter la rémunération et les dividendes.
            </p>
          </div>
          <div>
            <p className="font-bold">SASU</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Souplesse de gouvernance et régime assimilé salarié, mais le coût social (1,80 € pour
              1 € net) en fait l’option la plus chère à revenu identique — et zéro droit retraite en
              tout-dividendes.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Projection() {
  const { result, hypotheses: h, setField } = useSimulator();
  return (
    <>
      <SectionTitle
        eyebrow="Vision long terme"
        title="Projection sur 5 ans"
        text={`Net avant matériel initial, au taux plein dès l'année 2 (fin de l'ACRE) et CFE estimée à ${euro(CFE_YEAR2)}/an. Anticipez la TVA et la sortie du régime micro.`}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {h.growth.map((g, i) => (
          <NumberField
            key={i}
            label={`Croissance année ${i + 2}`}
            value={Math.round(g * 1000) / 10}
            onChange={(v) =>
              setField(
                "growth",
                h.growth.map((x, j) => (j === i ? v / 100 : x)),
              )
            }
            suffix="%"
            min={-90}
            max={300}
          />
        ))}
      </div>
      <Card>
        <CardContent className="p-5">
          <div
            className="h-[410px]"
            role="img"
            aria-label={`Projection sur 5 ans : CA de ${euro(result.projection[0].revenue)} à ${euro(result.projection[4].revenue)}, seuils TVA ${euro(h.vatCeiling)} et micro ${euro(h.microCeiling)}.`}
          >
            <ResponsiveContainer>
              <ComposedChart data={result.projection}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tickFormatter={fmtK} tick={AXIS_TICK} />
                <ChartTooltip content={<ChartTip />} />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Chiffre d’affaires"
                  fill="var(--chart-b2b)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  dataKey="net"
                  name="Net (avant matériel)"
                  stroke="var(--chart-net)"
                  strokeWidth={3}
                />
                <ReferenceLine
                  y={h.vatCeiling}
                  stroke="var(--gold)"
                  strokeDasharray="6 5"
                  label={{
                    value: `TVA ${fmtK(h.vatCeiling)}`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "var(--gold)",
                  }}
                />
                <ReferenceLine
                  y={h.microCeiling}
                  stroke="var(--destructive)"
                  strokeDasharray="6 5"
                  label={{
                    value: `Plafond micro ${fmtK(h.microCeiling)}`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "var(--destructive)",
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {result.projection.map((p) => (
              <div key={p.year} className="rounded-md border px-3 py-2 text-xs">
                <b>{p.year}</b> · {p.vat ? "TVA à facturer" : "Franchise TVA"}
                {p.micro && " · Sortie micro → société"}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            L’année 1 affiche {euro(result.projection[0].net)} : c’est le net avant le matériel
            initial de {euro(h.capex)} (le net réel de la Synthèse, {euro(result.realNet)}, le
            déduit). Au-delà du plafond micro, le régime change : les chiffres d’une année « Sortie
            micro » ne valent que comme ordre de grandeur.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

/* Page Démarrage — chemins, budget et critères issus de la phase 8 certifiée. */

const FORMALITY_BUDGET = [
  { label: "Taxe de première délivrance du titre de séjour (depuis le 01/05/2026)", amount: 350 },
  { label: "Immatriculation INPI — guichet unique, micro 81.21Z", amount: 0 },
  { label: "RC pro (~180 €/an) + avenant véhicule usage pro (~150 €/an)", amount: 330 },
  { label: "Impression plaquettes ×250 + cartes de visite ×250", amount: 65 },
  { label: "Recommandés, photos d’identité, divers", amount: 40 },
] as const;
const FORMALITY_TOTAL = FORMALITY_BUDGET.reduce((s, p) => s + p.amount, 0); // 785 €

const STEPS = [
  "Lire la date d’expiration du titre étudiant (cale tout le calendrier)",
  "Vérifier l’adresse en QPV sur sig.ville.gouv.fr (condition ACRE)",
  "Vérifier le bail + recommandé au bailleur (domiciliation au domicile)",
  "Obtenir 1-2 lettres d’intention B2B datées de moins de 3 mois",
  "Formaliser l’apport familial (don : formulaire 2735 ; prêt : reconnaissance de dette)",
  "Assembler le dossier préfecture (business plan, prévisionnel, lettres, fonds)",
  "Déposer le changement de statut à Bobigny (taxe 350 €)",
  "Obtenir le récépissé — il n’autorise PAS encore le travail (R431-14)",
  "Immatriculation INPI (gratuite) → SIRET + attestation URSSAF",
  "Délivrance du certificat de résidence (cible sept. 2026, plan B oct.-nov.)",
  "RC pro + avenant véhicule + compte bancaire dédié",
  "Demander l’ACRE sous 60 jours si QPV (silence 30 j = accord)",
  "Imprimer les supports avec le SIRET + publier la fiche Google",
  "Signer les premiers contrats = lancement commercial",
] as const;

function Startup() {
  const { result, hypotheses: h } = useSimulator();
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
  return (
    <>
      <SectionTitle
        eyebrow="Chemin critique"
        title="Prêt à démarrer ?"
        text="Les formalités dans l'ordre réel du parcours préfecture → INPI → titre → lancement, le budget exact et les critères de viabilité recalculés en direct."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <Card>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-bold">Avancement des formalités</p>
              <p className="text-sm tabular-nums">
                {checked.filter(Boolean).length} / {STEPS.length}
              </p>
            </div>
            <Progress value={(checked.filter(Boolean).length / STEPS.length) * 100} />
            <div className="mt-6 space-y-1">
              {STEPS.map((s, i) => {
                const stepId = `step-${i}`;
                return (
                  <label
                    key={s}
                    htmlFor={stepId}
                    className="flex cursor-pointer items-center gap-3 border-b py-3"
                  >
                    <Checkbox
                      id={stepId}
                      checked={checked[i] ?? false}
                      onCheckedChange={(v) => toggle(i, !!v)}
                    />
                    <span className={checked[i] ? "text-muted-foreground line-through" : ""}>
                      {s}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              ⚠ Le récépissé « en vue de l’immatriculation » garantit le séjour mais n’autorise pas
              de travailler (art. R431-14 CESEDA) : aucune prestation avant la délivrance du titre.
            </p>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="border-t-2 border-t-gold">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Budget formalités</p>
              <p className="mt-2 font-display text-3xl font-bold">{euro(FORMALITY_TOTAL)}</p>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {FORMALITY_BUDGET.map((p) => (
                  <p key={p.label} className="flex justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {p.amount === 0 ? "gratuit" : euro(p.amount)}
                    </span>
                  </p>
                ))}
              </div>
              <div className="my-3 h-px bg-border" />
              <p className="flex justify-between text-sm font-bold">
                <span>Besoin de départ (avec matériel {euro(h.capex)})</span>
                <span className="tabular-nums">{euro(startupNeed)}</span>
              </p>
              <p
                className={`mt-1 text-xs ${h.contribution >= startupNeed ? "text-success" : "text-destructive"}`}
              >
                {h.contribution >= startupNeed
                  ? `Couvert par l’apport de ${euro(h.contribution)}.`
                  : `Apport de ${euro(h.contribution)} insuffisant — il manque ${euro(startupNeed - h.contribution)}.`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Dépôt de marque INPI (190 €) : optionnel, hors budget, différable.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="font-bold">Critères de viabilité (recalculés en direct)</p>
              <div className="mt-3 space-y-2 text-sm">
                {criteria.map((c) => (
                  <p className="flex items-start gap-2" key={c.label}>
                    {c.ok ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    <span>
                      {c.label} <span className="text-xs text-muted-foreground">({c.detail})</span>
                    </span>
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Dictionary() {
  const { hypotheses: h, result } = useSimulator();
  const [query, setQuery] = useState("");
  const terms = useMemo<[string, string][]>(
    () => [
      [
        "Micro-entreprise",
        `Régime simplifié : les cotisations (${percent(h.socialRate)}) sont calculées directement sur le chiffre d'affaires encaissé. Pas de CA, pas de charges sociales.`,
      ],
      [
        "ACRE",
        `Réduction des cotisations au démarrage : ${percent(h.acreRate)} au lieu de ${percent(h.socialRate)}. Pour une création après le 01/07/2026, réservée aux adresses en quartier prioritaire (QPV) — gain ≈ 1 500 € sur l'année 1.`,
      ],
      [
        "Versement fiscal libératoire (VFL)",
        `L'impôt sur le revenu est payé au fil de l'eau : ${percent(h.taxRate)} du CA. Alternative : le barème sur 50 % du CA (ici TMI ${percent(h.tmi)}).`,
      ],
      [
        "CFP",
        `Contribution à la formation professionnelle des artisans : ${percent(h.cfpRate)} du CA. Elle finance vos propres formations (CQP, Certibiocide…).`,
      ],
      [
        "Franchise de TVA",
        `Sous ${euro(h.vatCeiling)} de CA, aucune TVA facturée. Dépassement attendu dès l'année 2 (${euro(result.projection[1]?.revenue ?? 0)}) — neutre pour les clients professionnels qui la récupèrent.`,
      ],
      [
        "Plafond micro",
        `Au-delà de ${euro(h.microCeiling)} de CA de services, sortie du régime micro. Le prévisionnel n'en approche jamais (année 5 : ${euro(result.projection[4]?.revenue ?? 0)}) ; la bascule en société se prépare dès 70 000 €.`,
      ],
      [
        "Net de gestion",
        `Ce qui reste chaque mois après prélèvements, charges variables et fixes : CA × ${percent(1 - result.globalRate - h.productsRate - h.travelRate)} − ${euro(h.fixedMonthly + h.renewalMonthly)}. En janvier 2027 : ${euro(result.months[4].netGestion)}.`,
      ],
      [
        "Net réel",
        `Le net de l'année complète après le matériel initial de ${euro(h.capex)} : ${euro(result.realNet)} pour l'année 1, soit ${euro(Math.round(result.realNet / 12))}/mois en moyenne.`,
      ],
      [
        "Point bas",
        `Trésorerie la plus basse de l'année : ${euro(result.lowCash)} en ${result.lowCashMonth.toLowerCase()}. C'est lui qui dimensionne l'apport, pas le total annuel.`,
      ],
      [
        "Croisière",
        `Rythme atteint une fois l'activité installée : moyenne des nets de juin-août 2027 = ${euro(result.cruiseNet)}/mois, saisonnalité d'été incluse.`,
      ],
      [
        "BFR (besoin en fonds de roulement)",
        `L'argent immobilisé par le décalage entre prestation et encaissement : ${percent(h.delayedShare)} du B2B est payé à 30 jours, soit ${euro(result.endReceivables)} de créances en fin d'année.`,
      ],
      [
        "CAPEX (matériel initial)",
        `Investissement de départ payé au mois 1 : ${euro(h.capex)} (aspirateur pro, monobrosse, kit vitrerie, consommables).`,
      ],
      [
        "Taux d'occupation",
        `Heures facturées ÷ capacité (${h.capacity} h/mois). Pic actuel : ${percent(result.maxOccupancy)}. Au-delà de 85 % trois mois de suite : nouveaux contrats à ${h.hourlyB2B + 2}-${h.hourlyB2B + 4} €/h ; au-delà de 90 % durable : préparer l'embauche.`,
      ],
      [
        "Taux effectif B2B",
        `Tarif moyen réellement facturé : ${h.hourlyB2B} € × (1 − ${percent(h.annualShare)} × ${percent(h.annualDiscount)}) = ${(h.hourlyB2B * (1 - h.annualShare * h.annualDiscount)).toFixed(3).replace(".", ",")} €/h, entre le tarif standard et le tarif annuel remisé.`,
      ],
      [
        "Saisonnalité",
        "Coefficient appliqué au B2B : 0,9 en décembre et juillet, 0,65 en août (fermetures des bureaux). C'est elle qui creuse le net d'août.",
      ],
      [
        "Scénario pessimiste",
        `Sites −35 %, Airbnb/particuliers −40 %, vitrerie −40 %, prix −5 % : ${euro(result.scenarios[0].net)} nets. Le projet doit rester vivable dans ce cas — c'est le chiffre que regarde la banque.`,
      ],
      [
        "CFE",
        `Cotisation foncière des entreprises : exonérée l'année de création, puis ≈ ${euro(CFE_YEAR2)}/an (incluse dans la projection dès l'année 2).`,
      ],
      [
        "Récépissé",
        "Document remis au dépôt du changement de statut : il maintient le droit au séjour mais n'autorise pas l'activité (art. R431-14 CESEDA). Le travail ne commence qu'au titre délivré.",
      ],
      [
        "QPV",
        "Quartier prioritaire de la politique de la ville. L'adresse du domicile (93) doit y figurer pour ouvrir l'ACRE — vérification sur sig.ville.gouv.fr.",
      ],
      [
        "Guichet unique INPI",
        "Le portail procedures.inpi.fr où s'immatricule la micro-entreprise (gratuit). L'activité 81.21Z « nettoyage courant des bâtiments » est artisanale : la CMA est l'autorité compétente.",
      ],
      [
        "TMI",
        `Tranche marginale d'imposition du foyer fiscal (ici ${percent(h.tmi)}). Elle sert au calcul de l'impôt si le versement libératoire est désactivé, et à l'IR de l'EI au réel.`,
      ],
      [
        "Contribution (par activité)",
        `Ce qu'une activité apporte après ses propres prélèvements et charges variables. B2B : ${euro(result.byActivity[0].contribution)} ; Airbnb : ${euro(result.byActivity[2].contribution)} sur l'année 1.`,
      ],
    ],
    [h, result],
  );
  const shown = terms.filter((t) => t.join(" ").toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <SectionTitle
        eyebrow="Comprendre le modèle"
        title="Dictionnaire financier & juridique"
        text="Des définitions courtes, recalculées en direct avec vos hypothèses — les exemples chiffrés bougent avec le simulateur."
      />
      <Input
        className="mb-5 max-w-md"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un terme…"
        aria-label="Rechercher un terme du dictionnaire"
      />
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun terme ne correspond à « {query} ».</p>
      ) : (
        <div className="grid gap-px overflow-hidden border bg-border md:grid-cols-2">
          {shown.map(([term, definition]) => (
            <article key={term} className="bg-card p-5">
              <p className="font-display text-lg font-bold text-primary">{term}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{definition}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Coquille applicative                                                */
/* ------------------------------------------------------------------ */

const PAGES: Record<Page, () => ReactNode> = {
  synthese: Summary,
  hypotheses: HypothesesPage,
  activite: Activity,
  resultat: Profit,
  tresorerie: Cash,
  scenarios: Scenarios,
  statuts: Statuses,
  projection: Projection,
  demarrage: Startup,
  dictionnaire: Dictionary,
};

const THEME_KEY = "az-theme";

export function SimulatorApp() {
  const [page, setPage] = useState<Page>("synthese");
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(false);
  const [copied, setCopied] = useState(false);
  // false au SSR comme au premier rendu client (pas de mismatch d'hydratation),
  // puis suit le breakpoint lg : sert à rendre la sidebar off-canvas inerte quand fermée.
  const [belowLg, setBelowLg] = useState(false);
  const { share, exportCsv } = useSimulator();
  const Content = PAGES[page];

  // Restaure la page depuis l'URL (?page=) et le thème déjà appliqué par le script anti-flash.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("page");
    if (fromUrl && (PAGE_IDS as readonly string[]).includes(fromUrl)) setPage(fromUrl as Page);
    setDark(document.documentElement.classList.contains("dark"));
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setBelowLg(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile]);

  const pick = (p: Page) => {
    setPage(p);
    setMobile(false);
    const url = new URL(window.location.href);
    url.searchParams.set("page", p);
    history.replaceState(null, "", url);
    smoothScrollTop();
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  const onShare = async () => {
    const outcome = await share();
    if (outcome === "copied") {
      setCopied(true);
      toast.success("Lien de simulation copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 1800);
    } else if (outcome === "failed") {
      toast.error("Partage impossible — autorisez l’accès au presse-papiers et réessayez");
    }
    // "shared" : la feuille de partage native a pris le relais, rien à afficher.
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        <aside
          className={`app-sidebar ${mobile ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 print:hidden`}
          inert={belowLg && !mobile ? true : undefined}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-content-center rounded-lg bg-sidebar-accent font-display text-lg font-black text-sidebar-accent-foreground">
                  AZ
                </div>
                <div>
                  <p className="font-display font-bold tracking-tight">L’AZ du Clean</p>
                  <p className="text-[11px] italic text-sidebar-foreground/60">
                    La propreté qui tient parole.
                  </p>
                </div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Navigation principale">
              {NAV.map(([id, label, Icon]) => (
                <Button
                  key={id}
                  variant="ghost"
                  onClick={() => pick(id)}
                  aria-current={page === id ? "page" : undefined}
                  className={`mb-1 w-full justify-start px-3 ${page === id ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : ""}`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </nav>
            <div className="border-t border-sidebar-border p-4 text-[10px] leading-4 text-sidebar-foreground/55">
              Prévisionnel indicatif 2026
              <br />
              Seine-Saint-Denis & Paris
            </div>
          </div>
        </aside>
        {mobile && (
          <button
            className="fixed inset-0 z-30 bg-overlay lg:hidden"
            aria-label="Fermer le menu"
            onClick={() => setMobile(false)}
          />
        )}
        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6 print:hidden">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobile(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu />
              </Button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Simulateur de viabilité
                </p>
                <h1 className="font-display text-lg font-bold">{TITLES[page]}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}
              >
                {dark ? <Sun /> : <Moon />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  exportCsv();
                  toast.success("Export CSV téléchargé");
                }}
                aria-label="Exporter en CSV"
              >
                <Download />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="sm:hidden"
                onClick={onShare}
                aria-label="Partager la simulation"
              >
                {copied ? <Check /> : <Share2 />}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex" onClick={onShare}>
                {copied ? <Check /> : <Share2 />}
                {copied ? "Lien copié" : "Partager"}
              </Button>
            </div>
          </header>
          <main className="mx-auto max-w-[1580px] p-4 md:p-6 lg:p-8">
            <Content />
          </main>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
