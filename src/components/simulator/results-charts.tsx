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
  computeModel,
  euro,
  fmtK,
  percent,
  safeRatio,
  type Hypotheses,
  type ModelResult,
  OFFICIAL,
  FIELD_REALISTIC,
  activePresetId,
} from "@/lib/simulator-model";
import { Kpi, SectionHead } from "./results";

// recharts (~115 kB gzip) vit dans ce module à part : chargé en lazy uniquement
// par les pages /synthese, /tresorerie et /scenarios.

const AXIS = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md min-w-[160px]">
      {label && (
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
          {label}
        </div>
      )}
      {payload.map((p, i) => {
        const n = Number(p.value);
        if (!Number.isFinite(n)) return null;
        return (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
              {p.name}
            </span>
            <span
              className={cn(
                "font-mono tabular-nums font-semibold",
                n >= 0 ? "text-foreground" : "text-destructive",
              )}
            >
              {euro(n)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
              {preset === "officiel"
                ? "préréglage officiel"
                : preset === "realiste"
                  ? "réaliste terrain"
                  : "hypothèses personnalisées"}
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
  const cotis = m.byActivity.reduce((s, a) => s + a.cotisations, 0);
  const impots = m.byActivity.reduce((s, a) => s + a.impot + a.cfp, 0);
  const variables = m.byActivity.reduce((s, a) => s + a.produits + a.deplacements, 0);
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
  const cotis = m.byActivity.reduce((s, a) => s + a.cotisations, 0);
  const impots = m.byActivity.reduce((s, a) => s + a.impot + a.cfp, 0);
  const variables = m.byActivity.reduce((s, a) => s + a.produits + a.deplacements, 0);
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

export function SyntheseView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const occupancy = m.maxOccupancy;
  return (
    <section className="space-y-5">
      <SectionHead
        title="Tableau de bord"
        desc="Vue d'ensemble : rentabilité, trésorerie, capacité et seuils réglementaires."
      />

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

      {/* Graphes */}
      <CaMensuelChart h={h} m={m} />
      <div className="grid gap-5 lg:grid-cols-2">
        <TresorerieMini m={m} />
        <ChargesDonut h={h} m={m} />
      </div>
      <ResultatWaterfall h={h} m={m} />
    </section>
  );
}

// ============================================================================
// Trésorerie 12 mois
// ============================================================================
function TresorerieMini({ m }: { m: ModelResult }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            Trésorerie 12 mois
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Point bas {euro(m.lowCash)}
          </div>
        </div>
        <div className="h-64" role="img" aria-label="Aperçu de la courbe de trésorerie sur 12 mois">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.months} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ ...AXIS, fontSize: 10 }}
                stroke="var(--border)"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ ...AXIS, fontSize: 10 }}
                stroke="var(--border)"
                tickFormatter={fmtK}
                width={46}
              />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="cash"
                name="Trésorerie"
                stroke={m.fundable ? "var(--chart-b2b)" : "var(--destructive)"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

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
// Scénarios : barres pessimiste/réaliste/optimiste + comparateur de préréglages
// ============================================================================
function ScenariosBarChart({ m }: { m: ModelResult }) {
  const colors = ["var(--warning)", "var(--chart-b2b)", "var(--success)"];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
          Net annuel par scénario
        </div>
        <div
          className="h-72"
          role="img"
          aria-label={`Nets annuels : ${m.scenarios.map((s) => `${s.name} ${euro(s.net)}`).join(", ")}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.scenarios} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="name" tick={AXIS} stroke="var(--border)" />
              <YAxis tick={AXIS} stroke="var(--border)" tickFormatter={fmtK} width={52} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "var(--muted)" }} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="net" name="Net annuel" radius={[6, 6, 0, 0]}>
                {m.scenarios.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {m.scenarios.map((s, i) => (
            <div key={s.name} className="rounded-md border px-3 py-2 text-xs">
              <p className="font-bold" style={{ color: colors[i] }}>
                {s.name}
              </p>
              <p className="mt-1 text-muted-foreground">CA {euro(s.ca)}</p>
              <p className="font-mono font-bold tabular-nums">{euro(s.net)} nets</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
          Sites −35 %/+35 %, Airbnb et particuliers −40 %/+25 %, vitrerie −40 %/+40 %, prix ±5 % —
          les formules de l'onglet Scénarios du prévisionnel. Le réaliste est recalculé par arrondi
          global (±1 € vs le net détaillé).
        </p>
      </CardContent>
    </Card>
  );
}

function MultiTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md min-w-[180px]">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono tabular-nums font-semibold">{euro(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PresetsCompareChart({ h }: { h: Hypotheses }) {
  // Recalcul pur (lecture seule) : mêmes volumes sous chaque préréglage de charges.
  const officiel = computeModel({
    ...OFFICIAL,
    sites: h.sites,
    airbnb: h.airbnb,
    glassJobs: h.glassJobs,
    privateJobs: h.privateJobs,
    seasonality: h.seasonality,
  });
  const realiste = computeModel({
    ...FIELD_REALISTIC,
    sites: h.sites,
    airbnb: h.airbnb,
    glassJobs: h.glassJobs,
    privateJobs: h.privateJobs,
    seasonality: h.seasonality,
  });
  const perso = computeModel(h);
  const preset = activePresetId(h);
  const data = [
    {
      metric: "Net réel",
      Officiel: officiel.realNet,
      Réaliste: realiste.realNet,
      Personnalisé: perso.realNet,
    },
    {
      metric: "Net de croisière",
      Officiel: officiel.cruiseNet,
      Réaliste: realiste.cruiseNet,
      Personnalisé: perso.cruiseNet,
    },
    {
      metric: "Point bas tréso.",
      Officiel: officiel.lowCash,
      Réaliste: realiste.lowCash,
      Personnalisé: perso.lowCash,
    },
  ];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
          Officiel · Réaliste · Personnalisé
        </div>
        <div className="h-72" role="img" aria-label="Comparaison des préréglages de charges">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="metric" tick={AXIS} stroke="var(--border)" />
              <YAxis tick={AXIS} stroke="var(--border)" tickFormatter={fmtK} width={52} />
              <Tooltip content={<MultiTip />} cursor={{ fill: "var(--muted)" }} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
              <Bar dataKey="Officiel" fill="var(--chart-b2b)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Réaliste" fill="var(--chart-glass)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Personnalisé" fill="var(--chart-airbnb)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Les volumes mensuels saisis sont conservés ; seules les charges changent.{" "}
          {preset
            ? `Vos hypothèses correspondent au préréglage ${preset === "officiel" ? "officiel" : "réaliste"}.`
            : "Vos hypothèses diffèrent des préréglages : la colonne « Personnalisé » reflète vos saisies."}
        </p>
      </CardContent>
    </Card>
  );
}

export function ScenariosView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  return (
    <section>
      <SectionHead
        title="Scénarios"
        desc="Sensibilité aux volumes et aux prix, et comparaison des jeux de charges."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <ScenariosBarChart m={m} />
        <PresetsCompareChart h={h} />
      </div>
    </section>
  );
}

// Ratio protégé réexporté pour les pages
export { safeRatio };
