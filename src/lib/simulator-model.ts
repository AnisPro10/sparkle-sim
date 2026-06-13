import { z } from "zod";

/**
 * Moteur financier de L'AZ du Clean — parité stricte avec les classeurs certifiés
 * Previsionnel_ProClean_AZ.xlsx et Simulation_Juridique_ProClean.xlsx (audit du 12/06/2026).
 *
 * Règles de parité (extraites cellule par cellule, voir audit/verite_*.json) :
 * - ROUND Excel = arrondi « half away from zero » (excelRound), différent de Math.round
 *   pour les négatifs ; ROUNDUP(x, −2) = plafond à la centaine en s'éloignant de zéro.
 * - Le taux B2B effectif (28,995) et le CA par site (301,31604) ne sont jamais arrondis.
 * - Seul le CA B2B est arrondi mois par mois ; vitrerie/Airbnb/particuliers restent exacts.
 * - Le NET RÉEL année 1 se calcule par activité sur les totaux annuels, chaque poste
 *   arrondi séparément (c'est ce qui donne 22 697 et non 22 696).
 * - Trésorerie : prélèvements assis sur l'ENCAISSÉ du mois, charges variables sur le CA
 *   FACTURÉ du mois — assiettes mixtes voulues par le classeur.
 * - Si VFL = NON, l'impôt au barème (50 % × TMI) n'apparaît QUE dans le net réel par
 *   activité ; le taux global (nets mensuels, trésorerie, scénarios, projection) n'inclut
 *   alors aucun impôt sur le revenu — asymétrie du classeur reproduite telle quelle.
 * - ACRE : le classeur applique le taux réduit sur tout l'exercice (pas de prorata 10 mois).
 *
 * Écarts assumés avec le classeur (documentés, pas des calages) :
 * - Apport minimal/recommandé : clampés à 0 (le classeur peut afficher des négatifs sans
 *   sens métier quand le point bas dépasse l'apport saisi).
 * - Scénarios avec plateau Airbnb/particuliers nul : composante à 0 au lieu du #DIV/0!
 *   que produirait le classeur.
 * - excelRound n'est garanti conforme à ROUND Excel que pour n = 0 (seul usage du moteur).
 *
 * Approximations héritées du classeur certifié (audit juridique du 13/06/2026) :
 * - Taxe pour frais de chambre CMA (0,48 % du CA artisanal, ≈ 176 €/an au plan officiel)
 *   absente du taux global 23,2 % — comme dans la cellule B27 du classeur.
 * - ACRE appliquée sur les 12 mois de l'exercice, alors que l'exonération légale s'arrête
 *   à la fin du 3e trimestre civil suivant le début d'activité (30/06/2027 pour un
 *   démarrage en sept. 2026) : juil.-août 2027 devraient repasser au taux plein.
 */

export const MONTHS = [
  "Sept. 2026",
  "Oct. 2026",
  "Nov. 2026",
  "Déc. 2026",
  "Janv. 2027",
  "Févr. 2027",
  "Mars 2027",
  "Avr. 2027",
  "Mai 2027",
  "Juin 2027",
  "Juil. 2027",
  "Août 2027",
] as const;

export const WEEKS_PER_MONTH = 4.33;
export const GLASS_HOURS = 2; // heures par intervention vitrerie
export const AIRBNB_HOURS = 2.5; // heures par rotation Airbnb
export const CFE_YEAR2 = 300; // CFE estimée dès l'année 2 (exonérée l'année de création)
export const CAPACITY_WARN = 0.85; // > 85 % trois mois → nouveaux contrats 32-34 €/h
export const CAPACITY_CRITICAL = 0.9; // > 90 % durable → préparer embauche + société

/** ROUND Excel : arrondi à n décimales, 0,5 s'éloignant de zéro (y compris négatifs).
 *  Le « + 0 » final neutralise le −0 de IEEE 754 (sinon Intl afficherait « -0 € »). */
export const excelRound = (x: number, n = 0): number => {
  const m = 10 ** n;
  return (Math.sign(x) * Math.round(Math.abs(x) * m + Number.EPSILON)) / m + 0;
};

/** ROUNDUP(x, −2) Excel : plafond à la centaine, en s'éloignant de zéro. */
export const roundUp100 = (x: number): number =>
  Math.sign(x) * Math.ceil(Math.abs(x) / 100 - 1e-9) * 100 + 0;

/* ------------------------------------------------------------------ */
/* Schéma : z.coerce + bornes par champ. Jamais utilisé en parse()    */
/* strict dans le rendu — clampHypotheses() ramène toute valeur       */
/* douteuse dans les bornes au lieu de jeter une exception.           */
/* ------------------------------------------------------------------ */

const num = z.coerce.number().finite();
const monthArray = (min: number, max: number) => z.array(num.min(min).max(max)).length(12);

export const hypothesesSchema = z.object({
  hourlyB2B: num.min(5, "min 5").max(200),
  annualShare: num.min(0).max(1),
  annualDiscount: num.min(0).max(0.5),
  visitsPerWeek: num.min(0).max(14),
  hoursPerVisit: num.min(0).max(12),
  glassRate: num.min(0).max(200),
  airbnbPrice: num.min(0).max(500),
  privateRate: num.min(0).max(200),
  privateHours: num.min(0).max(12),
  socialRate: num.min(0).max(0.6),
  acreRate: num.min(0).max(0.6),
  taxRate: num.min(0).max(0.5),
  cfpRate: num.min(0).max(0.1),
  acre: z.boolean(),
  vfl: z.boolean(),
  // Interrupteurs d'activité : décocher = exclure le segment de TOUS les calculs,
  // équivalent à des volumes à zéro dans l'Excel — les saisies restent conservées.
  enabledB2b: z.boolean(),
  enabledGlass: z.boolean(),
  enabledAirbnb: z.boolean(),
  enabledPrivate: z.boolean(),
  // Options « réalisme avancé » — désactivées par défaut : à zéro/false, le moteur
  // reste en parité stricte avec le classeur certifié (hors périmètre Excel sinon).
  churnRate: num.min(0).max(0.5),
  inflationPrices: num.min(0).max(0.2),
  inflationCosts: num.min(0).max(0.2),
  progressiveTax: z.boolean(),
  tmi: num.min(0).max(0.6),
  productsRate: num.min(0).max(0.5),
  travelRate: num.min(0).max(0.5),
  unpaidRate: num.min(0).max(0.5),
  fixedMonthly: num.min(0).max(5000),
  renewalMonthly: num.min(0).max(5000),
  contribution: num.min(0).max(1_000_000),
  capex: num.min(0).max(1_000_000),
  delayedShare: num.min(0).max(1),
  target: num.min(0).max(20000),
  capacity: num.min(1).max(1000),
  microCeiling: num.min(1000).max(500_000),
  vatCeiling: num.min(1000).max(500_000),
  sites: monthArray(0, 100),
  seasonality: monthArray(0, 2),
  glassJobs: monthArray(0, 100),
  airbnb: monthArray(0, 500),
  privateJobs: monthArray(0, 500),
  growth: z.array(num.min(-0.9).max(3)).length(4),
});

export type Hypotheses = z.infer<typeof hypothesesSchema>;

type NumericBounds = { min: number; max: number };
const FIELD_BOUNDS: Record<string, NumericBounds> = {
  hourlyB2B: { min: 5, max: 200 },
  annualShare: { min: 0, max: 1 },
  annualDiscount: { min: 0, max: 0.5 },
  visitsPerWeek: { min: 0, max: 14 },
  hoursPerVisit: { min: 0, max: 12 },
  glassRate: { min: 0, max: 200 },
  airbnbPrice: { min: 0, max: 500 },
  privateRate: { min: 0, max: 200 },
  privateHours: { min: 0, max: 12 },
  socialRate: { min: 0, max: 0.6 },
  acreRate: { min: 0, max: 0.6 },
  taxRate: { min: 0, max: 0.5 },
  cfpRate: { min: 0, max: 0.1 },
  tmi: { min: 0, max: 0.6 },
  productsRate: { min: 0, max: 0.5 },
  travelRate: { min: 0, max: 0.5 },
  unpaidRate: { min: 0, max: 0.5 },
  fixedMonthly: { min: 0, max: 5000 },
  renewalMonthly: { min: 0, max: 5000 },
  contribution: { min: 0, max: 1_000_000 },
  capex: { min: 0, max: 1_000_000 },
  delayedShare: { min: 0, max: 1 },
  target: { min: 0, max: 20000 },
  capacity: { min: 1, max: 1000 },
  microCeiling: { min: 1000, max: 500_000 },
  vatCeiling: { min: 1000, max: 500_000 },
  churnRate: { min: 0, max: 0.5 },
  inflationPrices: { min: 0, max: 0.2 },
  inflationCosts: { min: 0, max: 0.2 },
};
const MONTH_BOUNDS: Record<string, NumericBounds> = {
  sites: { min: 0, max: 100 },
  seasonality: { min: 0, max: 2 },
  glassJobs: { min: 0, max: 100 },
  airbnb: { min: 0, max: 500 },
  privateJobs: { min: 0, max: 500 },
};

export const boundsOf = (key: keyof Hypotheses): NumericBounds | undefined =>
  FIELD_BOUNDS[key] ?? MONTH_BOUNDS[key];

const clampNum = (v: unknown, b: NumericBounds, fallback: number): number => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(b.max, Math.max(b.min, n));
};

/**
 * Ramène n'importe quel objet (saisie en cours, localStorage legacy, hash forgé)
 * vers des Hypotheses valides : chaque champ est clampé dans ses bornes, toute
 * valeur inexploitable retombe sur la valeur par défaut. Ne jette JAMAIS.
 */
export function clampHypotheses(input: unknown): Hypotheses {
  const src = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, b] of Object.entries(FIELD_BOUNDS)) {
    out[key] = clampNum(src[key], b, OFFICIAL[key as keyof Hypotheses] as number);
  }
  for (const [key, b] of Object.entries(MONTH_BOUNDS)) {
    const def = OFFICIAL[key as keyof Hypotheses] as number[];
    const arr = Array.isArray(src[key]) ? (src[key] as unknown[]) : [];
    out[key] = def.map((d, i) => clampNum(arr[i], b, d));
  }
  out.growth = OFFICIAL.growth.map((d, i) =>
    clampNum(
      Array.isArray(src.growth) ? (src.growth as unknown[])[i] : undefined,
      { min: -0.9, max: 3 },
      d,
    ),
  );
  out.acre = typeof src.acre === "boolean" ? src.acre : OFFICIAL.acre;
  out.vfl = typeof src.vfl === "boolean" ? src.vfl : OFFICIAL.vfl;
  for (const key of ["enabledB2b", "enabledGlass", "enabledAirbnb", "enabledPrivate"] as const) {
    out[key] = typeof src[key] === "boolean" ? src[key] : true;
  }
  out.progressiveTax = typeof src.progressiveTax === "boolean" ? src.progressiveTax : false;
  return out as Hypotheses;
}

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

export const OFFICIAL: Hypotheses = {
  hourlyB2B: 30,
  annualShare: 0.5,
  annualDiscount: 0.067,
  visitsPerWeek: 2,
  hoursPerVisit: 1.2,
  glassRate: 32,
  airbnbPrice: 75,
  privateRate: 30,
  privateHours: 3,
  socialRate: 0.212,
  acreRate: 0.159,
  taxRate: 0.017,
  cfpRate: 0.003,
  acre: false,
  vfl: true,
  enabledB2b: true,
  enabledGlass: true,
  enabledAirbnb: true,
  enabledPrivate: true,
  churnRate: 0,
  inflationPrices: 0,
  inflationCosts: 0,
  progressiveTax: false,
  tmi: 0.11,
  productsRate: 0.04,
  travelRate: 0.05,
  unpaidRate: 0,
  fixedMonthly: 75,
  renewalMonthly: 0,
  contribution: 2000,
  capex: 1200,
  delayedShare: 1,
  target: 1500,
  capacity: 165,
  microCeiling: 83600,
  vatCeiling: 37500,
  sites: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  seasonality: [1, 1, 1, 0.9, 1, 1, 1, 1, 1, 1, 0.9, 0.65],
  glassJobs: [0, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1],
  airbnb: [2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 12, 12],
  privateJobs: [2, 4, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8],
  growth: [0.3, 0.2, 0.1, 0.1],
};

// Preset « Réaliste terrain » = colonne réaliste du Comparatif_Realiste de l'Excel
export const FIELD_REALISTIC: Hypotheses = {
  ...OFFICIAL,
  productsRate: 0.055,
  travelRate: 0.065,
  unpaidRate: 0.015,
  fixedMonthly: 95,
  renewalMonthly: 30,
};

export const PRESETS = [
  { id: "officiel", name: "Officiel · prudent", hypotheses: OFFICIAL },
  { id: "realiste", name: "Réaliste terrain", hypotheses: FIELD_REALISTIC },
] as const;

export function activePresetId(h: Hypotheses): string | null {
  // Comparaison canonique : clampHypotheses garantit un ordre de clés stable, alors
  // qu'un état relu depuis localStorage/URL peut avoir un ordre différent du littéral.
  const canon = JSON.stringify(clampHypotheses(h));
  for (const p of PRESETS) {
    if (JSON.stringify(clampHypotheses(p.hypotheses)) === canon) return p.id;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Formatage français                                                  */
/* ------------------------------------------------------------------ */

export const euro = (value: number, digits = 0) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: digits,
  }).format(value);

export const percent = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);

/** Pourcentage protégé : « — » si le dénominateur est nul. */
export const safePercent = (numerator: number, denominator: number) =>
  denominator > 0 ? percent(numerator / denominator) : "—";

export const safeRatio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

/** Étiquette d'axe « 12,5 k€ » au format français. */
export const fmtK = (v: number) =>
  Math.abs(v) >= 1000
    ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(v / 1000)} k€`
    : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v)} €`;

/* ------------------------------------------------------------------ */
/* Types de résultat                                                   */
/* ------------------------------------------------------------------ */

export type MonthResult = {
  month: string;
  b2b: number;
  glass: number;
  airbnb: number;
  private: number;
  ca: number;
  hours: number;
  netGestion: number;
  receipts: number;
  cash: number;
  overloaded: boolean;
};

export type ActivityBreakdown = {
  key: "b2b" | "glass" | "airbnb" | "private";
  label: string;
  ca: number;
  cotisations: number;
  impot: number;
  cfp: number;
  produits: number;
  deplacements: number;
  contribution: number;
};

export type ScenarioResult = { name: string; ca: number; net: number };

export type YearProjection = {
  year: string;
  revenue: number;
  net: number;
  vat: boolean;
  micro: boolean;
};

export type ModelResult = {
  months: MonthResult[];
  /** CA année 1 — définition du classeur : Σ CA mensuels (B2B arrondi par mois). */
  revenue: number;
  /** Taux global de prélèvement sur CA (cotisations + CFP + VFL le cas échéant). */
  globalRate: number;
  byActivity: ActivityBreakdown[];
  totalContribution: number;
  fixedYear: number;
  /** NET RÉEL année 1 = Σ contributions − fixes − CFE an 1 (0) − matériel initial. */
  realNet: number;
  /** Net de gestion moyen juin-juillet-août 2027 (avec saisonnalité). */
  cruiseNet: number;
  targetMonth: string | null;
  targetMonthIndex: number | null;
  monthsAboveTarget: number;
  lowCash: number;
  lowCashMonth: string;
  minimumContribution: number;
  recommendedContribution: number;
  endReceivables: number;
  maxOccupancy: number;
  peakHours: number;
  totalHours: number;
  fundable: boolean;
  scenarios: ScenarioResult[];
  projection: YearProjection[];
};

/* ------------------------------------------------------------------ */
/* Moteur pur                                                          */
/* ------------------------------------------------------------------ */

const ACTIVITY_LABELS = {
  b2b: "B2B récurrent",
  glass: "Vitrerie",
  airbnb: "Airbnb",
  private: "Particuliers",
} as const;

/** Taux global de prélèvement appliqué au CA (parité B27 du classeur). */
export function globalRate(h: Hypotheses): number {
  return (h.acre ? h.acreRate : h.socialRate) + h.cfpRate + (h.vfl ? h.taxRate : 0);
}

/** Barème progressif de l'IR 2026 sur les revenus 2025 (1 part) — option avancée hors
 *  périmètre du classeur. Tranches de la loi de finances n° 2026-103 du 19/02/2026
 *  (indexation +0,9 % du barème 2025). */
export const IR_BRACKETS_2026 = [
  { upTo: 11600, rate: 0 },
  { upTo: 29579, rate: 0.11 },
  { upTo: 84577, rate: 0.3 },
  { upTo: 181917, rate: 0.41 },
  { upTo: Infinity, rate: 0.45 },
] as const;

export function progressiveIncomeTax(taxableIncome: number): number {
  let tax = 0;
  let floor = 0;
  for (const { upTo, rate } of IR_BRACKETS_2026) {
    if (taxableIncome <= floor) break;
    tax += (Math.min(taxableIncome, upTo) - floor) * rate;
    floor = upTo;
  }
  return Math.max(0, tax);
}

/**
 * Sites effectifs du mois, attrition déduite (option churn ; 0 = parité classeur).
 * Le plan saisi représente les acquisitions brutes ; on retire la perte moyenne
 * cumulée d'un taux annuel réparti linéairement sur l'exercice.
 */
function effectiveSites(h: Hypotheses, i: number): number {
  return h.sites[i] * Math.max(0, 1 - h.churnRate * ((i + 0.5) / 12));
}

function monthlyRows(h: Hypotheses): MonthResult[] {
  const effectiveRate = h.hourlyB2B * (1 - h.annualShare * h.annualDiscount); // 28,995 — jamais arrondi
  const siteMonthly = h.visitsPerWeek * WEEKS_PER_MONTH * h.hoursPerVisit * effectiveRate; // 301,31604
  const rate = globalRate(h);
  // Activité décochée = volumes neutralisés partout (équivalent Excel : zéros sur 12 mois)
  const onB2b = h.enabledB2b ? 1 : 0;
  const onGlass = h.enabledGlass ? 1 : 0;
  const onAirbnb = h.enabledAirbnb ? 1 : 0;
  const onPrivate = h.enabledPrivate ? 1 : 0;
  return MONTHS.map((month, i) => {
    const sites = effectiveSites(h, i);
    const b2b = onB2b * excelRound(sites * siteMonthly * h.seasonality[i] * (1 - h.unpaidRate));
    const glass = onGlass * h.glassJobs[i] * h.glassRate * GLASS_HOURS;
    const airbnb = onAirbnb * h.airbnb[i] * h.airbnbPrice;
    const privateRevenue = onPrivate * h.privateJobs[i] * h.privateRate * h.privateHours;
    const ca = b2b + glass + airbnb + privateRevenue;
    const hours = excelRound(
      onB2b * sites * h.visitsPerWeek * WEEKS_PER_MONTH * h.hoursPerVisit * h.seasonality[i] +
        onGlass * h.glassJobs[i] * GLASS_HOURS +
        onAirbnb * h.airbnb[i] * AIRBNB_HOURS +
        onPrivate * h.privateJobs[i] * h.privateHours,
    );
    const netGestion = excelRound(
      ca * (1 - rate - h.productsRate - h.travelRate) - h.fixedMonthly - h.renewalMonthly,
    );
    return {
      month,
      b2b,
      glass,
      airbnb,
      private: privateRevenue,
      ca,
      hours,
      netGestion,
      receipts: 0,
      cash: 0,
      overloaded: hours > h.capacity,
    };
  });
}

/** Les activités cochées, dans l'ordre canonique. */
export function enabledActivities(h: Hypotheses): ("b2b" | "glass" | "airbnb" | "private")[] {
  return (
    [
      ["b2b", h.enabledB2b],
      ["glass", h.enabledGlass],
      ["airbnb", h.enabledAirbnb],
      ["private", h.enabledPrivate],
    ] as const
  )
    .filter(([, on]) => on)
    .map(([key]) => key);
}

/** Net réel par activité (parité onglet Resultat : chaque poste arrondi sur le total annuel).
 *  Seules les activités cochées apparaissent — les vues et exports suivent automatiquement. */
function activityBreakdown(h: Hypotheses, months: MonthResult[]): ActivityBreakdown[] {
  const keys = enabledActivities(h);
  const totalCa = months.reduce((sum, m) => sum + m.ca, 0);
  // Option avancée : impôt au barème progressif réel (au lieu de TMI plate) quand
  // le VFL est désactivé — réparti entre activités au prorata du CA.
  const progressiveTotal =
    !h.vfl && h.progressiveTax && totalCa > 0 ? progressiveIncomeTax(0.5 * totalCa) : null;
  return keys.map((key) => {
    const ca = months.reduce((sum, m) => sum + m[key], 0);
    const cotisations = excelRound(ca * (h.acre ? h.acreRate : h.socialRate));
    const impot =
      progressiveTotal !== null
        ? excelRound((progressiveTotal * ca) / totalCa)
        : excelRound(ca * (h.vfl ? h.taxRate : 0.5 * h.tmi));
    const cfp = excelRound(ca * h.cfpRate);
    const produits = excelRound(ca * h.productsRate);
    const deplacements = excelRound(ca * h.travelRate);
    return {
      key,
      label: ACTIVITY_LABELS[key],
      ca,
      cotisations,
      impot,
      cfp,
      produits,
      deplacements,
      contribution: ca - cotisations - impot - cfp - produits - deplacements,
    };
  });
}

/**
 * Scénarios pessimiste / réaliste / optimiste — formules exactes de l'onglet Scenarios.
 * Parité : le « Réaliste » applique la formule C19 (arrondi global sur le CA total) et peut
 * donc différer de quelques euros du NET RÉEL détaillé par activité (±1 € aux presets
 * certifiés, jusqu'à ~4 € observés sur hypothèses extrêmes) — l'écart existe aussi dans le
 * classeur (C19 = 22 696 vs Resultat!F18 = 22 697). Sans VFL, les trois scénarios
 * s'entendent avant impôt au barème (comme le classeur). Le plateau de sites est celui du
 * DERNIER mois (Plan_Activite!M6), pas le maximum. Plateau Airbnb/particuliers nul →
 * composante à 0 (le classeur afficherait #DIV/0!).
 */
function buildScenarios(h: Hypotheses, revenue: number): ScenarioResult[] {
  const effectiveRate = h.hourlyB2B * (1 - h.annualShare * h.annualDiscount);
  const siteMonthly = h.visitsPerWeek * WEEKS_PER_MONTH * h.hoursPerVisit * effectiveRate;
  const seasonAvg = h.seasonality.reduce((a, b) => a + b, 0) / 12;
  // Sites « en fin d'année » (Plan_Activite!M6), attrition churn déduite comme dans
  // effectiveSites — à churnRate = 0 (parité classeur), facteurs strictement neutres.
  const plateauSites = h.sites[11] * Math.max(0, 1 - h.churnRate * (11.5 / 12));
  const sites0 = h.sites[0] * Math.max(0, 1 - h.churnRate * (0.5 / 12));
  const plateauAirbnb = Math.max(...h.airbnb);
  const plateauPrivate = Math.max(...h.privateJobs);
  const glassYear = h.glassJobs.reduce((a, b) => a + b, 0);
  const airbnbYear = h.airbnb.reduce((a, b) => a + b, 0) * h.airbnbPrice;
  const privateYear = h.privateJobs.reduce((a, b) => a + b, 0) * h.privateRate * h.privateHours;
  const rate = globalRate(h);
  const variableRate = h.productsRate + h.travelRate;
  const yearlyFixed = (h.fixedMonthly + h.renewalMonthly) * 12;

  const variant = (
    name: string,
    fSites: number,
    fRate: number,
    fAirbnb: number,
    fPrivate: number,
    fGlass: number,
  ): ScenarioResult => {
    const S = excelRound(plateauSites * fSites);
    const R = excelRound(siteMonthly * fRate);
    const A = excelRound(plateauAirbnb * fAirbnb);
    const P = excelRound(plateauPrivate * fPrivate);
    const V = excelRound(glassYear * fGlass);
    const caB2BVit =
      (h.enabledB2b ? excelRound(((sites0 + S) / 2) * 12 * R * seasonAvg) : 0) +
      (h.enabledGlass ? excelRound(V * h.glassRate * GLASS_HOURS) : 0);
    const caAirbnb =
      h.enabledAirbnb && plateauAirbnb > 0 ? excelRound((airbnbYear * A) / plateauAirbnb) : 0;
    const caPrivate =
      h.enabledPrivate && plateauPrivate > 0 ? excelRound((privateYear * P) / plateauPrivate) : 0;
    const ca = caB2BVit + caAirbnb + caPrivate;
    const net = ca - excelRound(ca * rate) - excelRound(ca * variableRate) - yearlyFixed - h.capex;
    return { name, ca, net };
  };

  // Formule Scenarios!C19 : net réaliste recalculé par arrondi global sur le CA du plan.
  const realisticNet =
    revenue -
    excelRound(revenue * rate) -
    excelRound(revenue * variableRate) -
    yearlyFixed -
    h.capex;

  return [
    variant("Pessimiste", 0.65, 0.95, 0.6, 0.6, 0.6),
    { name: "Réaliste", ca: revenue, net: realisticNet },
    variant("Optimiste", 1.35, 1.05, 1.25, 1.25, 1.4),
  ];
}

/** Projection 5 ans — parité onglet Projection_5ans (net AVANT matériel initial).
 *  Options avancées : inflation des prix (s'ajoute à la croissance en volume) et
 *  inflation des charges fixes — à 0, parité stricte avec le classeur. */
function buildProjection(h: Hypotheses, revenue: number): YearProjection[] {
  const fullRate = h.socialRate + h.cfpRate + (h.vfl ? h.taxRate : 0);
  const variableRate = h.productsRate + h.travelRate;
  const netOf = (ca: number, rate: number, cfe: number, fixedYear: number) =>
    ca - excelRound(ca * rate) - excelRound(ca * variableRate) - excelRound(fixedYear) - cfe;
  const baseFixed = (h.fixedMonthly + h.renewalMonthly) * 12;
  const projection: YearProjection[] = [
    {
      year: "Année 1",
      revenue,
      net: netOf(revenue, globalRate(h), 0, baseFixed),
      vat: revenue > h.vatCeiling,
      micro: revenue > h.microCeiling,
    },
  ];
  h.growth.forEach((g, i) => {
    const ca = excelRound(projection[i].revenue * (1 + g) * (1 + h.inflationPrices));
    const fixedYear = baseFixed * (1 + h.inflationCosts) ** (i + 1);
    projection.push({
      year: `Année ${i + 2}`,
      revenue: ca,
      net: netOf(ca, fullRate, CFE_YEAR2, fixedYear),
      vat: ca > h.vatCeiling,
      micro: ca > h.microCeiling,
    });
  });
  return projection;
}

export function computeModel(input: Hypotheses): ModelResult {
  const h = clampHypotheses(input); // ne jette jamais : toute saisie est ramenée dans les bornes
  const months = monthlyRows(h);
  const rate = globalRate(h);

  // Trésorerie : encaissements B2B+vitrerie décalés de 30 j (part delayedShare),
  // prélèvements sur l'encaissé, charges variables sur le facturé (parité Tresorerie).
  let cash = h.contribution;
  months.forEach((row, i) => {
    const delayed30 = excelRound(
      (row.b2b + row.glass) * (1 - h.delayedShare) +
        (i > 0 ? (months[i - 1].b2b + months[i - 1].glass) * h.delayedShare : 0),
    );
    const immediate = row.airbnb + row.private;
    row.receipts = delayed30 + immediate;
    cash +=
      row.receipts -
      excelRound(row.receipts * rate) -
      excelRound(row.ca * (h.productsRate + h.travelRate)) -
      h.fixedMonthly -
      h.renewalMonthly -
      (i === 0 ? h.capex : 0);
    row.cash = cash;
  });

  const revenue = months.reduce((sum, row) => sum + row.ca, 0);
  const byActivity = activityBreakdown(h, months);
  const totalContribution = byActivity.reduce((sum, a) => sum + a.contribution, 0);
  const fixedYear = (h.fixedMonthly + h.renewalMonthly) * 12;
  const realNet = totalContribution - fixedYear - h.capex; // CFE an 1 = 0 (année de création)

  const cruise = months.slice(9);
  const cruiseNet = excelRound(cruise.reduce((s, m) => s + m.netGestion, 0) / cruise.length);

  const targetIdx = months.findIndex((row) => row.netGestion >= h.target);
  const low = months.reduce((a, b) => (a.cash < b.cash ? a : b));
  const minimumContribution = Math.max(0, roundUp100(h.contribution - low.cash));
  const peakHours = Math.max(...months.map((m) => m.hours));

  return {
    months,
    revenue,
    globalRate: rate,
    byActivity,
    totalContribution,
    fixedYear,
    realNet,
    cruiseNet,
    targetMonth: targetIdx >= 0 ? MONTHS[targetIdx] : null,
    targetMonthIndex: targetIdx >= 0 ? targetIdx : null,
    monthsAboveTarget: months.filter((m) => m.netGestion >= h.target).length,
    lowCash: low.cash,
    lowCashMonth: low.month,
    minimumContribution,
    recommendedContribution: Math.max(0, roundUp100(minimumContribution * 1.3)),
    endReceivables: excelRound((months[11].b2b + months[11].glass) * h.delayedShare),
    maxOccupancy: safeRatio(peakHours, h.capacity),
    peakHours,
    totalHours: months.reduce((s, m) => s + m.hours, 0),
    fundable: low.cash >= 0,
    scenarios: buildScenarios(h, revenue),
    projection: buildProjection(h, revenue),
  };
}

/* ------------------------------------------------------------------ */
/* Seuils en année civile — précision réglementaire                    */
/* Le plafond micro et la franchise TVA s'apprécient par année CIVILE, */
/* au prorata temporis la première année. L'exercice du plan court de  */
/* septembre 2026 à août 2027 : la 1re année civile = sept-déc 2026,   */
/* soit 122 jours → seuils × 122/365. Pur affichage : aucune incidence */
/* sur les calculs du plan (parité classeur préservée).                */
/* ------------------------------------------------------------------ */

export const CIVIL_2026_RATIO = 122 / 365;

export type CivilYearCheck = {
  /** CA facturé de septembre à décembre 2026. */
  revenue2026: number;
  vatThresholdProrated: number;
  microThresholdProrated: number;
  vatExceeded: boolean;
  microExceeded: boolean;
};

export function civilYear2026Check(h: Hypotheses, m: ModelResult): CivilYearCheck {
  const revenue2026 = m.months.slice(0, 4).reduce((s, x) => s + x.ca, 0);
  const vatThresholdProrated = excelRound(h.vatCeiling * CIVIL_2026_RATIO);
  const microThresholdProrated = excelRound(h.microCeiling * CIVIL_2026_RATIO);
  return {
    revenue2026,
    vatThresholdProrated,
    microThresholdProrated,
    vatExceeded: revenue2026 > vatThresholdProrated,
    microExceeded: revenue2026 > microThresholdProrated,
  };
}

/* ------------------------------------------------------------------ */
/* Comparateur de statuts juridiques                                   */
/* Parité stricte Simulation_Juridique_ProClean.xlsx (6 variantes).    */
/* ------------------------------------------------------------------ */

export const LEGAL = {
  tauxTns: 0.32, // cotisations TNS (EI), % du bénéfice
  cotisationsTnsMin: 1300, // plancher TNS €/an
  coefCoutRemuEurl: 1.45, // coût d'1 € net de rémunération gérant TNS
  coefCoutSalaireSasu: 1.8, // coût d'1 € net de salaire président
  seuilIsReduit: 42500,
  tauxIsReduit: 0.15,
  tauxIsNormal: 0.25,
  flatTax: 0.314, // PFU 2026 : 12,8 % IR + 18,6 % PS
  capitalSocial: 1000,
  tauxTnsDividendes: 0.45, // EURL, dividendes > 10 % du capital
  tauxIrDividendes: 0.128,
  remuEurlReference: 18000, // variante EURL retenue au Comparatif
  abattementMicro: 0.5,
} as const;

export type LegalStatus = {
  id: string;
  name: string;
  value: number;
  monthly: number;
  note: string;
};

const impotSocietes = (base: number) =>
  LEGAL.tauxIsReduit * Math.min(base, LEGAL.seuilIsReduit) +
  LEGAL.tauxIsNormal * Math.max(base - LEGAL.seuilIsReduit, 0);

/**
 * Net en poche annuel par statut, à CA identique — formules du classeur juridique.
 * Asymétrie du classeur reproduite : la micro ne déduit pas de CFE (année de création),
 * EI/EURL/SASU déduisent une CFE de 300 € (année type).
 */
export function legalStatuses(h: Hypotheses, revenue: number): LegalStatus[] {
  const variableRate = h.productsRate + h.travelRate;
  const fixedYear = (h.fixedMonthly + h.renewalMonthly) * 12;
  const chargesMicro = revenue * variableRate + fixedYear;
  const benefice = revenue * (1 - variableRate) - fixedYear - CFE_YEAR2;

  const micro = (cotisRate: number, impot: number) =>
    revenue - revenue * cotisRate - revenue * h.cfpRate - impot - chargesMicro;
  const microVfl = micro(h.socialRate, revenue * h.taxRate);
  const microAcre = micro(h.acreRate, revenue * h.taxRate);
  const microBareme = micro(h.socialRate, revenue * LEGAL.abattementMicro * h.tmi);

  const tns = Math.max(benefice * LEGAL.tauxTns, LEGAL.cotisationsTnsMin);
  const ei = benefice - tns - Math.max(benefice - tns, 0) * h.tmi;

  const eurlNet = (remu: number) => {
    const baseIs = Math.max(
      benefice - remu * LEGAL.coefCoutRemuEurl - (remu === 0 ? LEGAL.cotisationsTnsMin : 0),
      0,
    );
    const distribuable = baseIs - impotSocietes(baseIs);
    const seuil = 0.1 * LEGAL.capitalSocial;
    const dividendes =
      Math.min(distribuable, seuil) * (1 - LEGAL.flatTax) +
      Math.max(distribuable - seuil, 0) * (1 - LEGAL.tauxTnsDividendes - LEGAL.tauxIrDividendes);
    return remu + dividendes;
  };

  const sasuNet = (remu: number) => {
    const baseIs = Math.max(benefice - remu * LEGAL.coefCoutSalaireSasu, 0);
    const distribuable = baseIs - impotSocietes(baseIs);
    return remu + Math.max(distribuable, 0) * (1 - LEGAL.flatTax);
  };

  // La rémunération de référence (18 000 €) est plafonnée à ce que le bénéfice peut
  // réellement financer (coût = net × 1,45) : sans ce plafond, un CA faible afficherait
  // un « net en poche » EURL supérieur au bénéfice de l'entreprise.
  const remuEurl = Math.min(
    LEGAL.remuEurlReference,
    Math.max(0, benefice / LEGAL.coefCoutRemuEurl),
  );

  const rows: LegalStatus[] = [
    {
      id: "micro-acre",
      name: "Micro + ACRE (QPV) + VFL",
      value: microAcre,
      monthly: excelRound(microAcre / 12),
      note: `Cotisations réduites à ${percent(h.acreRate)} la première année — sous conditions : demandeur d'emploi, RSA, moins de 26 ans, moins de 30 ans non indemnisable, ou adresse en QPV/ZFRR (à vérifier sur sig.ville.gouv.fr).`,
    },
    {
      id: "micro-vfl",
      name: "Micro + versement libératoire",
      value: microVfl,
      monthly: excelRound(microVfl / 12),
      note: `Simple et lisible : ${percent(h.socialRate + h.cfpRate + h.taxRate)} du CA encaissé (hors taxe frais de chambre CMA 0,48 %), zéro comptabilité d'engagement.`,
    },
    {
      id: "micro-bareme",
      name: "Micro au barème (TMI)",
      value: microBareme,
      monthly: excelRound(microBareme / 12),
      note: `Impôt au barème sur 50 % du CA (abattement micro-BIC services) — pertinent si la TMI du foyer descend sous ${percent(2 * h.taxRate)}.`,
    },
    {
      id: "eurl",
      name: `EURL — rémunération ${euro(remuEurl)}`,
      value: eurlNet(remuEurl),
      monthly: excelRound(eurlNet(remuEurl) / 12),
      note: "Gérant TNS (coût ≈ 1,45 × net), IS sur le solde puis dividendes — devient pertinente avec de vraies charges déductibles.",
    },
    {
      id: "ei",
      name: "EI au réel",
      value: ei,
      monthly: excelRound(ei / 12),
      note: "Charges réelles déductibles, cotisations TNS ≈ 32 % du bénéfice (plancher 1 300 €) puis impôt au barème.",
    },
    {
      id: "sasu",
      name: "SASU — tout dividendes",
      value: sasuNet(0),
      monthly: excelRound(sasuNet(0) / 12),
      note: "Aucune cotisation minimale mais zéro droits retraite ; IS puis flat tax 31,4 % sur les dividendes.",
    },
  ];
  return rows.sort((a, b) => b.value - a.value);
}
