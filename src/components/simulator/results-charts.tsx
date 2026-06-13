import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarCheck,
  Gauge,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CAPACITY_CRITICAL,
  CAPACITY_WARN,
  civilYear2026Check,
  computeModel,
  euro,
  fmtK,
  percent,
  synthesisIndicators,
  type Hypotheses,
  type ModelResult,
  OFFICIAL,
  activePresetId,
} from "@/lib/simulator-model";
import { Kpi, SectionHead } from "./results";
import { AXIS, ChartTip, chargesAggregates, presetLabel } from "./charts/charts-common";

// recharts (~115 kB gzip) vit dans ce module à part : chargé en lazy uniquement
// par les pages /synthese, /tresorerie et /scenarios. Les primitives partagées
// (ChartTip, AXIS, helpers) vivent dans ./charts/charts-common.

// ============================================================================
// Synthèse — tableau de bord (alertes + hero + KPI + graphes)
// ============================================================================
function HeroNet({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const positive = m.realNet > 0;
  const preset = activePresetId(h);
  return (
    <Card
      className="relative overflow-hidden border-0 text-white shadow-lg"
      style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
    >
      <div
        className="absolute inset-0 opacity-25 pointer-events-none mix-blend-overlay"
        aria-hidden="true"
        style={{
          background: "radial-gradient(circle at 80% 0%, var(--gold) 0%, transparent 55%)",
        }}
      />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/80 font-semibold">
              <Sparkles className="h-3 w-3 text-[var(--gold)]" />
              Net réel année 1
            </div>
            <div className="mt-2 font-mono text-4xl sm:text-5xl font-bold tabular-nums leading-none">
              {euro(m.realNet)}
            </div>
            <div className="mt-2 text-xs text-white/80">
              après matériel initial · micro-entreprise ·{" "}
              {presetLabel(preset, "hypothèses personnalisées")}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider",
              positive ? "bg-white/90 text-[#1F3864]" : "bg-destructive text-white",
            )}
          >
            {positive ? "Viable" : "Perte"}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-[11px]">
          <div>
            <div className="uppercase tracking-wider text-white/70">Net mensuel moyen</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {euro(Math.round(m.realNet / 12))}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-wider text-white/70">Croisière</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {euro(m.cruiseNet)}/mois
            </div>
          </div>
          <div>
            <div className="uppercase tracking-wider text-white/70">Objectif {euro(h.target)}</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {m.targetMonth ?? "non atteint"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CaMensuelChart({ h, m }: { h: Hypotheses; m: ModelResult }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
          Chiffre d'affaires mensuel par activité
        </div>
        <div
          className="h-80"
          role="img"
          aria-label={`CA mensuel empilé par activité, net de gestion en courbe ; CA année 1 ${euro(m.revenue)}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={m.months} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={AXIS}
                stroke="var(--border)"
                interval="preserveStartEnd"
                angle={-18}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={AXIS} stroke="var(--border)" tickFormatter={fmtK} width={56} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
              {h.enabledB2b && (
                <Bar dataKey="b2b" name="B2B récurrent" stackId="ca" fill="var(--chart-b2b)" />
              )}
              {h.enabledGlass && (
                <Bar dataKey="glass" name="Vitrerie" stackId="ca" fill="var(--chart-glass)" />
              )}
              {h.enabledAirbnb && (
                <Bar dataKey="airbnb" name="Airbnb" stackId="ca" fill="var(--chart-airbnb)" />
              )}
              {h.enabledPrivate && (
                <Bar
                  dataKey="private"
                  name="Particuliers"
                  stackId="ca"
                  fill="var(--chart-private)"
                />
              )}
              {/* Rouge vif demandé : le vert se confondait avec les barres empilées */}
              <Line
                type="monotone"
                dataKey="netGestion"
                name="Net de gestion"
                stroke="var(--destructive)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--destructive)" }}
              />
              <ReferenceLine
                y={h.target}
                stroke="var(--warning)"
                strokeDasharray="6 5"
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
  );
}

function ChargesDonut({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const { cotis, impots, variables } = chargesAggregates(m);
  const data = [
    { name: "Cotisations sociales", value: cotis },
    { name: "Impôt + formation", value: impots },
    { name: "Produits & déplacements", value: variables },
    { name: "Charges fixes", value: m.fixedYear },
    { name: "Matériel initial", value: h.capex },
  ].filter((d) => d.value > 0);
  const total = data.reduce((a, b) => a + b.value, 0);
  const colors = [
    "var(--chart-b2b)",
    "var(--chart-glass)",
    "var(--chart-airbnb)",
    "var(--chart-private)",
    "var(--chart-net)",
  ];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            Répartition des charges
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">Total {euro(total)}</div>
        </div>
        <div className="h-64" role="img" aria-label="Répartition des charges annuelles">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResultatWaterfall({ h, m }: { h: Hypotheses; m: ModelResult }) {
  type Step = { label: string; base: number; value: number; signed: number; isTotal: boolean };
  const steps: Step[] = [];
  let running = 0;
  const push = (label: string, delta: number) => {
    const start = delta >= 0 ? running : running + delta;
    running += delta;
    steps.push({ label, base: start, value: Math.abs(delta), signed: delta, isTotal: false });
  };
  const { cotis, impots, variables } = chargesAggregates(m);
  push("CA", m.revenue);
  push("− Cotisations", -cotis);
  push("− Impôt & CFP", -impots);
  push("− Variables", -variables);
  push("− Fixes", -m.fixedYear);
  push("− Matériel", -h.capex);
  const data = [
    ...steps,
    { label: "Net réel", base: 0, value: Math.abs(running), signed: running, isTotal: true },
  ];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
          Du chiffre d'affaires au net réel
        </div>
        <div className="h-72" role="img" aria-label="Cascade du compte de résultat">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ ...AXIS, fontSize: 10 }}
                stroke="var(--border)"
                interval={0}
                angle={-15}
                textAnchor="end"
                height={52}
              />
              <YAxis tick={AXIS} stroke="var(--border)" tickFormatter={fmtK} width={56} />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                        {label}
                      </div>
                      <div
                        className={cn(
                          "font-mono text-sm font-semibold tabular-nums",
                          d.signed >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {d.signed >= 0 ? "+" : "−"}
                        {euro(Math.abs(d.signed))}
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="base" stackId="w" fill="transparent" />
              <Bar dataKey="value" stackId="w" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.isTotal
                        ? d.signed >= 0
                          ? "var(--primary)"
                          : "var(--destructive)"
                        : d.signed >= 0
                          ? "var(--success)"
                          : "var(--destructive)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Indicateurs d'activité — moyennes de prestations, heures, paniers, mix, occupation.
 *  Purement dérivés (aucun impact sur les calculs). */
function ActivityIndicators({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const k = synthesisIndicators(h, m);
  const mixColors: Record<string, string> = {
    b2b: "var(--chart-b2b)",
    glass: "var(--chart-glass)",
    airbnb: "var(--chart-airbnb)",
    private: "var(--chart-private)",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
          Indicateurs d'activité
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat
            label="Interventions / mois"
            value={nf0.format(Math.round(k.sessionsPerMonth))}
            sub={`${nf0.format(Math.round(k.sessionsYear))} / an`}
          />
          <Stat
            label="Heures facturées / mois"
            value={`${nf0.format(Math.round(k.hoursPerMonth))} h`}
            sub={`${nf0.format(Math.round(k.hoursYear))} h / an`}
          />
          <Stat label="Durée moy. / intervention" value={`${nf1.format(k.avgSessionHours)} h`} />
          <Stat label="Panier moyen / intervention" value={euro(Math.round(k.avgTicket))} />
          <Stat label="CA moyen / mois" value={euro(Math.round(k.caPerMonth))} />
          <Stat
            label="Occupation moyenne"
            value={percent(k.avgOccupancy)}
            sub={`pic ${percent(m.maxOccupancy)}`}
          />
          <Stat label="Marge nette / heure" value={`${nf1.format(k.netPerHour)} €/h`} />
          <Stat label="Clients B2B fin d'année" value={nf0.format(k.b2bClientsEnd)} />
        </div>
        {k.caMix.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              Mix d'activité (part du CA)
            </div>
            <div className="flex h-3 overflow-hidden rounded-full">
              {k.caMix.map((s) => (
                <div
                  key={s.key}
                  style={{
                    width: `${s.share * 100}%`,
                    background: mixColors[s.key] ?? "var(--muted)",
                  }}
                  title={`${s.label} : ${percent(s.share)}`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {k.caMix.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ background: mixColors[s.key] ?? "var(--muted)" }}
                  />
                  {s.label} {percent(s.share)}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SyntheseView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const occupancy = m.maxOccupancy;
  const civil = civilYear2026Check(h, m);
  return (
    <section className="space-y-5">
      <SectionHead
        title="Tableau de bord"
        desc="Vue d'ensemble : rentabilité, trésorerie, capacité et seuils réglementaires."
      />

      {/* Seuils en année civile : prorata temporis de la 1re année (sept-déc 2026) */}
      {civil.vatExceeded && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <span>
            <strong>Franchise de TVA — année civile 2026 :</strong> le CA de septembre à décembre (
            {euro(civil.revenue2026)}) dépasse le seuil proratisé de{" "}
            {euro(civil.vatThresholdProrated)} (37 500 € × 122/365 jours) : la TVA serait à facturer
            dès 2026, pas seulement en année 2.
          </span>
        </div>
      )}

      {/* Alertes */}
      {!m.fundable && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <TrendingDown className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Trésorerie négative en cours d'année (point bas <strong>{euro(m.lowCash)}</strong>).
            Portez l'apport à au moins <strong>{euro(m.minimumContribution)}</strong>, réduisez le
            matériel initial ou renforcez les activités payées comptant (Airbnb, particuliers).
          </span>
        </div>
      )}
      {!m.targetMonth && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <span>
            Aucun mois n'atteint l'objectif de <strong>{euro(h.target)}</strong> nets : renforcez
            les volumes ou les tarifs.
          </span>
        </div>
      )}
      {occupancy > CAPACITY_WARN && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
            occupancy > CAPACITY_CRITICAL
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-warning/40 bg-warning/10 text-foreground",
          )}
        >
          <Gauge
            className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              occupancy <= CAPACITY_CRITICAL && "text-warning",
            )}
          />
          <span>
            Occupation au pic <strong>{percent(occupancy)}</strong> ({m.peakHours} h sur{" "}
            {h.capacity} h).{" "}
            {occupancy > CAPACITY_CRITICAL
              ? `Au-delà de ${percent(CAPACITY_CRITICAL)} durable : préparer l'embauche et la bascule en société.`
              : `Au-delà de ${percent(CAPACITY_WARN)} : proposer les nouveaux contrats à ${h.hourlyB2B + 2}-${h.hourlyB2B + 4} €/h (les clients existants gardent leur tarif).`}
          </span>
        </div>
      )}

      {/* Hero + KPI rapides */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HeroNet h={h} m={m} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Kpi
            icon={CalendarCheck}
            label={`Objectif ${euro(h.target)}`}
            value={m.targetMonth ?? "—"}
            sub={`${m.monthsAboveTarget} mois sur 12 au-dessus`}
            tone={m.targetMonth ? "good" : "bad"}
          />
          <Kpi
            icon={m.fundable ? TrendingUp : TrendingDown}
            label="Point bas tréso."
            term="Point bas de trésorerie"
            value={euro(m.lowCash)}
            sub={m.lowCashMonth}
            tone={m.fundable ? "good" : "bad"}
          />
          <Kpi
            icon={Wallet}
            label="Apport recommandé"
            value={euro(m.recommendedContribution)}
            sub={`minimal ${euro(m.minimumContribution)}`}
            tone={h.contribution >= m.recommendedContribution ? "good" : "neutral"}
          />
          <Kpi
            icon={Gauge}
            label="Occupation pic"
            term="Taux d'occupation"
            value={percent(occupancy)}
            sub={`${m.peakHours} h / ${h.capacity} h`}
            tone={occupancy <= CAPACITY_CRITICAL ? "good" : "bad"}
          />
        </div>
      </div>

      {/* Indicateurs d'activité (lecture seule, dérivés du Plan d'activité) */}
      <ActivityIndicators h={h} m={m} />

      {/* Graphes — la courbe de trésorerie et la cascade CA→net vivent dans leurs
          rubriques dédiées (Trésorerie, Compte de résultat) : pas de doublon ici. */}
      <CaMensuelChart h={h} m={m} />
      <ChargesDonut h={h} m={m} />
    </section>
  );
}

// ============================================================================
// Trésorerie 12 mois
// ============================================================================

export function TresorerieView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const low = m.months.reduce((a, b) => (b.cash < a.cash ? b : a), m.months[0]);
  const rows = m.months.map((p, i) => ({
    mois: p.month,
    cash: p.cash,
    delta: p.cash - (i === 0 ? h.contribution : m.months[i - 1].cash),
    isLow: p.month === low?.month,
  }));
  return (
    <section>
      <SectionHead
        title="Trésorerie mois par mois"
        desc={`Apport ${euro(h.contribution)} · ${percent(h.delayedShare)} du B2B/vitrerie encaissé à 30 jours · point bas ${euro(m.lowCash)} en ${m.lowCashMonth}`}
      />
      <Card>
        <CardContent className="p-5">
          <div
            className="h-72"
            role="img"
            aria-label={`Courbe de trésorerie sur 12 mois, point bas ${euro(m.lowCash)}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="month" tick={AXIS} stroke="var(--border)" />
                <YAxis tick={AXIS} stroke="var(--border)" tickFormatter={fmtK} width={52} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="cash"
                  name="Trésorerie"
                  stroke="var(--chart-b2b)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--chart-b2b)" }}
                  activeDot={{ r: 5 }}
                />
                {low && (
                  <ReferenceDot
                    x={low.month}
                    y={low.cash}
                    r={5}
                    fill={m.fundable ? "var(--success)" : "var(--destructive)"}
                    stroke="white"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardContent className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            Détail mois par mois
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <caption className="sr-only">
                Trésorerie de fin de mois et variation mensuelle sur 12 mois
              </caption>
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="text-left font-medium py-2 pr-3">
                    Mois
                  </th>
                  <th scope="col" className="text-right font-medium py-2 px-3">
                    Trésorerie fin de mois
                  </th>
                  <th scope="col" className="text-right font-medium py-2 pl-3">
                    Variation
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60">
                  <th
                    scope="row"
                    className="text-left font-normal text-muted-foreground py-1.5 pr-3"
                  >
                    Départ (apport)
                  </th>
                  <td className="text-right py-1.5 px-3 font-mono tabular-nums text-foreground font-medium">
                    {euro(h.contribution)}
                  </td>
                  <td className="text-right py-1.5 pl-3 font-mono tabular-nums text-muted-foreground">
                    —
                  </td>
                </tr>
                {rows.map((r) => {
                  const d = Math.round(r.delta);
                  return (
                    <tr
                      key={r.mois}
                      className={cn("border-t border-border/60", r.isLow && "bg-destructive/5")}
                    >
                      <th
                        scope="row"
                        className="text-left font-normal text-muted-foreground py-1.5 pr-3"
                      >
                        {r.mois}
                        {r.isLow && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wider text-destructive font-semibold">
                            point bas
                          </span>
                        )}
                      </th>
                      <td
                        className={cn(
                          "text-right py-1.5 px-3 font-mono tabular-nums font-semibold",
                          r.cash < 0 ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {euro(r.cash)}
                      </td>
                      <td
                        className={cn(
                          "text-right py-1.5 pl-3 font-mono tabular-nums font-medium",
                          d < 0
                            ? "text-destructive"
                            : d > 0
                              ? "text-success"
                              : "text-muted-foreground",
                        )}
                      >
                        {d === 0 ? "—" : (d > 0 ? "+" : "−") + euro(Math.abs(d))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
            Prélèvements calculés sur l'encaissé du mois, charges variables sur le facturé — les
            assiettes du prévisionnel certifié. Créances clients en fin d'année :{" "}
            {euro(m.endReceivables)}.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

// ============================================================================
// Scénarios : votre simulation comparée aux bornes du marché (étude certifiée)
// ============================================================================

// Bornes FIXES issues de l'étude de marché : les formules de l'onglet Scénarios
// appliquées au préréglage officiel (8 sites/prix −5 %/volumes −40 % en pessimiste ;
// 16 sites/prix +5 %/volumes +25 à +40 % en optimiste). Elles ne bougent pas avec
// vos saisies : ce sont les murs du couloir, votre scénario se place entre les deux.
const MARKET = computeModel(OFFICIAL).scenarios;
const MARKET_PESS = MARKET[0];
const MARKET_OPT = MARKET[2];

function PositionGauge({ net }: { net: number }) {
  const span = MARKET_OPT.net - MARKET_PESS.net;
  const pos = span > 0 ? Math.min(1, Math.max(0, (net - MARKET_PESS.net) / span)) : 0;
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>
          Pessimiste · <span className="font-mono tabular-nums">{euro(MARKET_PESS.net)}</span>
        </span>
        <span>
          Optimiste · <span className="font-mono tabular-nums">{euro(MARKET_OPT.net)}</span>
        </span>
      </div>
      <div
        className="relative h-3 rounded-full"
        role="img"
        aria-label={`Votre net annuel ${euro(net)} se situe à ${Math.round(pos * 100)} % du couloir pessimiste-optimiste du marché`}
        style={{
          background: "linear-gradient(90deg, var(--warning), var(--chart-b2b), var(--success))",
          opacity: 0.9,
        }}
      >
        <span
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-background bg-foreground shadow-md"
          style={{ left: `${pos * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 text-center text-xs font-medium">
        Votre scénario : <span className="font-mono tabular-nums">{euro(net)}</span> —{" "}
        {Math.round(pos * 100)} % du couloir du marché
      </p>
    </div>
  );
}

export function ScenariosView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const preset = activePresetId(h);
  const cols = [
    {
      key: "pess",
      name: "Pessimiste (marché)",
      sub: "borne basse de l'étude",
      ca: MARKET_PESS.ca,
      net: MARKET_PESS.net,
      user: false,
      color: "var(--warning)",
    },
    {
      key: "user",
      name: "Votre scénario",
      sub: presetLabel(preset, "saisies personnalisées"),
      ca: m.revenue,
      net: m.realNet,
      user: true,
      color: "var(--chart-b2b)",
    },
    {
      key: "opt",
      name: "Optimiste (marché)",
      sub: "borne haute de l'étude",
      ca: MARKET_OPT.ca,
      net: MARKET_OPT.net,
      user: false,
      color: "var(--success)",
    },
  ];
  type Col = (typeof cols)[number];
  const rows: { label: string; get: (c: Col) => string; strong?: boolean }[] = [
    { label: "Chiffre d'affaires année 1", get: (c) => euro(c.ca) },
    { label: "Net réel année 1", get: (c) => euro(c.net), strong: true },
    { label: "Net mensuel moyen", get: (c) => euro(Math.round(c.net / 12)) },
    { label: "Net de croisière (juin-août)", get: (c) => (c.user ? euro(m.cruiseNet) : "—") },
    { label: "Point bas de trésorerie", get: (c) => (c.user ? euro(m.lowCash) : "—") },
    {
      label: "Occupation au pic",
      get: (c) => (c.user ? `${percent(m.maxOccupancy)} (${m.peakHours} h)` : "—"),
    },
  ];
  return (
    <section>
      <SectionHead
        title="Votre scénario face au marché"
        desc="Les bornes pessimiste et optimiste sont fixées par l'étude de marché certifiée ; votre simulation (hypothèses + plan d'activité + activités cochées) se positionne entre les deux."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Comparaison chiffrée
            </div>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <caption className="sr-only">
                  Votre scénario comparé aux bornes pessimiste et optimiste du marché
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wider py-2 pr-3 align-bottom"
                    >
                      Indicateur
                    </th>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        className={cn(
                          "text-right py-2 px-3 align-bottom",
                          c.user && "bg-primary/5 rounded-t-md",
                        )}
                      >
                        <span className="block font-display text-sm font-semibold">{c.name}</span>
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {c.sub}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t border-border/60">
                      <th
                        scope="row"
                        className={cn(
                          "text-left font-normal py-2 pr-3",
                          r.strong ? "text-foreground font-semibold" : "text-muted-foreground",
                        )}
                      >
                        {r.label}
                      </th>
                      {cols.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "text-right py-2 px-3 font-mono tabular-nums",
                            c.user && "bg-primary/5",
                            r.strong ? "font-bold" : "font-medium",
                          )}
                        >
                          {r.get(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PositionGauge net={m.realNet} />
            <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
              Croisière, point bas et occupation n'existent en détail mensuel que pour votre
              scénario — les bornes du marché sont les agrégats annuels de l'onglet Scénarios du
              prévisionnel (pessimiste : 8 sites fin d'année, prix −5 %, Airbnb/particuliers −40 %,
              vitrerie −40 % ; optimiste : 16 sites, prix +5 %, volumes +25 à +40 %).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Net annuel — votre position
            </div>
            <div
              className="h-80"
              role="img"
              aria-label={`Nets annuels : ${cols.map((c) => `${c.name} ${euro(c.net)}`).join(", ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cols} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} stroke="var(--border)" />
                  <YAxis tick={AXIS} stroke="var(--border)" tickFormatter={fmtK} width={52} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "var(--muted)" }} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar dataKey="net" name="Net annuel" radius={[6, 6, 0, 0]}>
                    {cols.map((c) => (
                      <Cell
                        key={c.key}
                        fill={c.color}
                        stroke={c.user ? "var(--foreground)" : undefined}
                        strokeWidth={c.user ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
              La barre encadrée est votre simulation courante. Si vos saisies sont le préréglage
              officiel, elle tombe sur le « réaliste » du classeur certifié (±1 € d'arrondi).
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ============================================================================
// Projection 5 ans — CA en barres, net en ligne, seuils TVA et micro tracés
// ============================================================================
export function ProjectionChart({ h, m }: { h: Hypotheses; m: ModelResult }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
          Chiffre d'affaires et net sur 5 ans
        </div>
        <div
          className="h-96"
          role="img"
          aria-label={`Projection : CA de ${euro(m.projection[0]?.revenue ?? 0)} à ${euro(m.projection[4]?.revenue ?? 0)}, seuil TVA ${euro(h.vatCeiling)}, plafond micro ${euro(h.microCeiling)}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={m.projection} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="year" tick={AXIS} stroke="var(--border)" />
              <YAxis
                tick={AXIS}
                stroke="var(--border)"
                tickFormatter={fmtK}
                width={56}
                // Étend l'échelle pour que le plafond micro reste toujours visible
                domain={[0, (dataMax: number) => Math.max(dataMax * 1.08, h.microCeiling * 1.06)]}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill: "var(--muted)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
              <Bar
                dataKey="revenue"
                name="Chiffre d'affaires"
                fill="var(--chart-b2b)"
                radius={[6, 6, 0, 0]}
                maxBarSize={72}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net (avant matériel)"
                stroke="var(--chart-net)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--chart-net)" }}
              />
              <ReferenceLine
                y={h.vatCeiling}
                stroke="var(--gold)"
                strokeWidth={1.5}
                strokeDasharray="7 5"
                label={{
                  value: `Franchise TVA ${fmtK(h.vatCeiling)}`,
                  position: "insideBottomLeft",
                  fontSize: 10,
                  fill: "var(--gold)",
                }}
              />
              <ReferenceLine
                y={h.microCeiling}
                stroke="var(--destructive)"
                strokeWidth={1.5}
                strokeDasharray="7 5"
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
        <div className="mt-3 flex flex-wrap gap-2">
          {m.projection.map((p) => (
            <span
              key={p.year}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px]",
                p.micro
                  ? "border-destructive/40 text-destructive"
                  : p.vat
                    ? "border-gold/50 text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              <b>{p.year}</b> · {p.vat ? "TVA à facturer" : "franchise TVA"}
              {p.micro && " · sortie micro"}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
