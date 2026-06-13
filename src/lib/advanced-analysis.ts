import {
  AIRBNB_HOURS,
  computeModel,
  excelRound,
  GLASS_HOURS,
  globalRate,
  inDetailMode,
  scalePlan,
  WEEKS_PER_MONTH,
  type Hypotheses,
} from "./simulator-model";

/**
 * Analyses avancées du simulateur. La matrice de sensibilité réplique l'onglet
 * Sensibilite du prévisionnel certifié ; tornado, goal seek et Monte-Carlo sont
 * des extensions web (hors périmètre du classeur, déterministes et documentées).
 */

/* ------------------------------------------------------------------ */
/* Matrice de sensibilité — parité onglet Sensibilite                  */
/* ------------------------------------------------------------------ */

// Part de la vitrerie en % du CA B2B (Hypotheses!B17 du classeur, constante d'étude).
export const GLASS_SHARE_OF_B2B = 0.07;

/**
 * Net d'un mois PLEIN hors saisonnalité pour N sites au taux T — formule exacte de
 * l'onglet Sensibilite : (CA B2B plein × (1 + part vitrerie) + appoints au plateau)
 * × (1 − taux global − variables) − fixes, arrondi à l'euro.
 */
export function fullMonthNet(h: Hypotheses, sites: number, hourlyRate: number): number {
  const caB2b =
    sites *
    h.visitsPerWeek *
    WEEKS_PER_MONTH *
    h.hoursPerVisit *
    hourlyRate *
    (1 - h.annualShare * h.annualDiscount) *
    (1 + (h.enabledGlass ? GLASS_SHARE_OF_B2B : 0)) *
    (h.enabledB2b ? 1 : 0);
  const sideline =
    (h.enabledAirbnb ? Math.max(...h.airbnb) * h.airbnbPrice : 0) +
    (h.enabledPrivate ? Math.max(...h.privateJobs) * h.privateRate * h.privateHours : 0);
  return excelRound(
    (caB2b + sideline) * (1 - globalRate(h) - h.productsRate - h.travelRate) -
      h.fixedMonthly -
      h.renewalMonthly,
  );
}

export type SensitivityMatrix = {
  /** "average" = grille certifiée sites × €/h (site moyen) ; "detail" = ± volume × ± prix
   *  sur le plan réel (net annuel). */
  mode: "average" | "detail";
  rates: number[]; // average : €/h ; detail : prix en % (90-110)
  rows: { sites: number; cells: number[] }[]; // average : sites ; detail : volume en %
  current: { sites: number; rate: number };
  colUnit: string; // "€/h" ou "%"
  rowUnit: string; // "sites" ou "%"
  cellKind: "monthly" | "annualNet";
};

/** Matrice de sensibilité. Mode moyenne (préréglage officiel) : grille sites × taux du
 *  classeur (case 12 × 30 = 3 620 €). Mode détaillé : ± volume × ± prix appliqués au PLAN
 *  RÉEL, chaque case = net réel annuel → cohérent avec le Plan d'activité. */
export function sensitivityMatrix(h: Hypotheses): SensitivityMatrix {
  if (inDetailMode(h)) {
    const volAxis = [80, 90, 100, 110, 120];
    const priceAxis = [90, 95, 100, 105, 110];
    return {
      mode: "detail",
      rates: priceAxis,
      rows: volAxis.map((vol) => ({
        sites: vol,
        cells: priceAxis.map((price) => computeModel(scalePlan(h, vol / 100, price / 100)).realNet),
      })),
      current: { sites: 100, rate: 100 },
      colUnit: "%",
      rowUnit: "%",
      cellKind: "annualNet",
    };
  }
  const s = Math.max(2, Math.round(h.sites[11]));
  const sitesAxis = [
    Math.max(1, Math.round(s * 0.5)),
    Math.max(1, Math.round(s * 0.75)),
    s,
    Math.round(s * 1.25),
    Math.round(s * 1.5),
  ];
  const r = h.hourlyB2B;
  const ratesAxis = [r - 4, r - 2, r, r + 2, r + 4];
  return {
    mode: "average",
    rates: ratesAxis,
    rows: sitesAxis.map((sites) => ({
      sites,
      cells: ratesAxis.map((rate) => fullMonthNet(h, sites, rate)),
    })),
    current: { sites: s, rate: r },
    colUnit: "€/h",
    rowUnit: "sites",
    cellKind: "monthly",
  };
}

/* ------------------------------------------------------------------ */
/* Tornado — quel levier fait le plus bouger le net réel (±10 %)       */
/* ------------------------------------------------------------------ */

export type TornadoItem = {
  label: string;
  /** Net réel si le levier baisse de 10 % (ou se dégrade). */
  low: number;
  /** Net réel si le levier monte de 10 % (ou s'améliore). */
  high: number;
  /** Amplitude totale |high − low| — sert au classement. */
  span: number;
};

const scaleMonths = (values: number[], f: number) => values.map((v) => v * f);

export function tornado(h: Hypotheses): { base: number; items: TornadoItem[] } {
  const base = computeModel(h).realNet;
  const net = (patch: Partial<Hypotheses>) => computeModel({ ...h, ...patch }).realNet;
  const items: TornadoItem[] = [
    {
      label: "Taux horaire B2B (±10 %)",
      low: net({ hourlyB2B: h.hourlyB2B * 0.9 }),
      high: net({ hourlyB2B: h.hourlyB2B * 1.1 }),
      span: 0,
    },
    {
      label: "Sites B2B (±10 %)",
      low: net({ sites: scaleMonths(h.sites, 0.9) }),
      high: net({ sites: scaleMonths(h.sites, 1.1) }),
      span: 0,
    },
    {
      label: "Volumes Airbnb (±10 %)",
      low: net({ airbnb: scaleMonths(h.airbnb, 0.9) }),
      high: net({ airbnb: scaleMonths(h.airbnb, 1.1) }),
      span: 0,
    },
    {
      label: "Prestations particuliers (±10 %)",
      low: net({ privateJobs: scaleMonths(h.privateJobs, 0.9) }),
      high: net({ privateJobs: scaleMonths(h.privateJobs, 1.1) }),
      span: 0,
    },
    {
      label: "Charges variables (±10 %)",
      low: net({ productsRate: h.productsRate * 1.1, travelRate: h.travelRate * 1.1 }),
      high: net({ productsRate: h.productsRate * 0.9, travelRate: h.travelRate * 0.9 }),
      span: 0,
    },
    {
      label: "Charges fixes (±10 %)",
      low: net({ fixedMonthly: h.fixedMonthly * 1.1, renewalMonthly: h.renewalMonthly * 1.1 }),
      high: net({ fixedMonthly: h.fixedMonthly * 0.9, renewalMonthly: h.renewalMonthly * 0.9 }),
      span: 0,
    },
    {
      label: "Part de contrats annuels (±10 pts)",
      low: net({ annualShare: Math.min(1, h.annualShare + 0.1) }),
      high: net({ annualShare: Math.max(0, h.annualShare - 0.1) }),
      span: 0,
    },
  ].map((item) => ({ ...item, span: Math.abs(item.high - item.low) }));
  items.sort((a, b) => b.span - a.span);
  return { base, items };
}

/* ------------------------------------------------------------------ */
/* Goal seek — combien faut-il pour atteindre un net mensuel cible ?   */
/* ------------------------------------------------------------------ */

export type GoalSeekResult = {
  lever: string;
  current: number;
  required: number | null; // null = inatteignable dans les bornes
  unit: string;
  achievedNet: number | null;
};

/** Net de croisière obtenu en appliquant `value` au levier choisi. */
function cruiseWith(h: Hypotheses, lever: "rate" | "sites" | "hours", value: number): number {
  if (lever === "rate") return computeModel({ ...h, hourlyB2B: value }).cruiseNet;
  if (lever === "hours") return computeModel({ ...h, hoursPerVisit: value }).cruiseNet;
  // sites : on met le plan à l'échelle pour finir l'année à `value` sites
  const target = Math.max(1, h.sites[11]);
  const f = value / target;
  return computeModel({ ...h, sites: scaleMonths(h.sites, f) }).cruiseNet;
}

function bisect(
  h: Hypotheses,
  lever: "rate" | "sites" | "hours",
  lo: number,
  hi: number,
  goal: number,
): number | null {
  if (cruiseWith(h, lever, hi) < goal) return null; // inatteignable même au max
  if (cruiseWith(h, lever, lo) >= goal) return lo; // déjà atteint au min
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (cruiseWith(h, lever, mid) >= goal) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Pour un objectif de net mensuel en croisière : résout chacun des 3 leviers. */
export function goalSeek(h: Hypotheses, monthlyGoal: number): GoalSeekResult[] {
  const out: GoalSeekResult[] = [];
  const rate = bisect(h, "rate", 5, 200, monthlyGoal);
  out.push({
    lever: "Taux horaire B2B",
    current: h.hourlyB2B,
    required: rate === null ? null : Math.ceil(rate * 2) / 2, // au ½ € supérieur
    unit: "€/h",
    achievedNet: rate === null ? null : cruiseWith(h, "rate", Math.ceil(rate * 2) / 2),
  });
  // Plan de sites entièrement à 0 : la mise à l'échelle (0 × f) est inopérante — le
  // levier ne peut rien atteindre, on renvoie null plutôt qu'un « 1 site » trompeur.
  const sites = h.sites[11] === 0 ? null : bisect(h, "sites", 1, 60, monthlyGoal);
  out.push({
    lever: "Sites B2B en fin d'année",
    current: h.sites[11],
    required: sites === null ? null : Math.ceil(sites),
    unit: "sites",
    achievedNet: sites === null ? null : cruiseWith(h, "sites", Math.ceil(sites)),
  });
  const hours = bisect(h, "hours", 0.25, 12, monthlyGoal);
  out.push({
    lever: "Heures par passage B2B",
    current: h.hoursPerVisit,
    required: hours === null ? null : Math.ceil(hours * 10) / 10,
    unit: "h",
    achievedNet: hours === null ? null : cruiseWith(h, "hours", Math.ceil(hours * 10) / 10),
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Monte-Carlo — incertitude dans les bornes de l'étude de marché      */
/* ------------------------------------------------------------------ */

export type MonteCarloResult = {
  runs: number;
  p10: number;
  p50: number;
  p90: number;
  probGoal: number; // P(net mensuel moyen ≥ objectif)
  probNegativeCash: number; // P(point bas de trésorerie < 0)
  histogram: { from: number; to: number; count: number }[];
};

// Générateur pseudo-aléatoire seedé (mulberry32) : résultats reproductibles
// d'un chargement à l'autre — pas de Math.random.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tirage triangulaire (min, mode, max). */
function triangular(rnd: () => number, min: number, mode: number, max: number): number {
  const u = rnd();
  const fc = (mode - min) / (max - min);
  return u < fc
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

export function monteCarlo(h: Hypotheses, runs = 2000, seed = 42): MonteCarloResult {
  const rnd = mulberry32(seed);
  const nets: number[] = [];
  let goalHits = 0;
  let negativeCash = 0;
  for (let i = 0; i < runs; i++) {
    // Bornes des tirages = les bornes de l'étude (onglet Scénarios du prévisionnel)
    const fSites = triangular(rnd, 0.65, 1, 1.35);
    const dRate = triangular(rnd, -0.05, 0, 0.05);
    const fAirbnb = triangular(rnd, 0.6, 1, 1.25);
    const fPrivate = triangular(rnd, 0.6, 1, 1.25);
    const fGlass = triangular(rnd, 0.6, 1, 1.4);
    // Borne haute élargie au vécu saisi : à unpaidRate ≤ 3 % (presets), inchangé.
    const unpaid = triangular(rnd, 0, Math.min(h.unpaidRate, 0.03), Math.max(0.03, h.unpaidRate));
    const r = computeModel({
      ...h,
      hourlyB2B: h.hourlyB2B * (1 + dRate),
      sites: scaleMonths(h.sites, fSites),
      airbnb: scaleMonths(h.airbnb, fAirbnb),
      privateJobs: scaleMonths(h.privateJobs, fPrivate),
      glassJobs: scaleMonths(h.glassJobs, fGlass),
      unpaidRate: unpaid,
    });
    nets.push(r.realNet);
    if (r.realNet / 12 >= h.target) goalHits++;
    if (r.lowCash < 0) negativeCash++;
  }
  nets.sort((a, b) => a - b);
  const q = (p: number) => nets[Math.min(runs - 1, Math.floor(p * runs))];
  // Histogramme en 12 classes pour la visualisation
  const min = nets[0];
  const max = nets[runs - 1];
  const bins = 12;
  const width = (max - min) / bins || 1;
  const histogram = Array.from({ length: bins }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
  }));
  for (const n of nets) {
    const idx = Math.min(bins - 1, Math.floor((n - min) / width));
    histogram[idx].count++;
  }
  return {
    runs,
    p10: q(0.1),
    p50: q(0.5),
    p90: q(0.9),
    probGoal: goalHits / runs,
    probNegativeCash: negativeCash / runs,
    histogram,
  };
}

/* ------------------------------------------------------------------ */
/* Droits sociaux — trimestres de retraite validés par le CA micro     */
/* ------------------------------------------------------------------ */

// Règle officielle (art. R351-9 CSS) : 1 trimestre par tranche de 150 SMIC horaire de
// revenu ; en micro-BIC services le revenu = 50 % du CA → 3 564 € de CA par trimestre,
// 14 256 € pour les 4 (barème 2026, SMIC 11,88 €). L'étude certifiée retenait ≈ 13 000 €
// (barème antérieur) : divergence assumée — aucun chiffre financier certifié n'en dépend.
export const QUARTER_THRESHOLDS = [3564, 7128, 10692, 14256] as const;

export function retirementQuarters(revenue: number): number {
  return QUARTER_THRESHOLDS.filter((t) => revenue >= t).length;
}
