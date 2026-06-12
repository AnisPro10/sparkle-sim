// Réalisé mensuel saisi par l'utilisateur (page Pilotage) — conservé sur l'appareil
// et embarqué dans l'export/import JSON. Indépendant des hypothèses : le réel ne
// modifie jamais le plan, il s'y compare.
export type MonthActuals = {
  b2b?: number;
  glass?: number;
  airbnb?: number;
  private?: number;
  hours?: number;
};
export type Actuals = Record<number, MonthActuals>; // clé = index du mois (0-11)

export const ACTUALS_KEY = "az-clean-actuals-v1";

const clampValue = (v: unknown, max: number): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : undefined;
};

/** Validation douce : toute entrée corrompue est ignorée, jamais d'exception. */
export function sanitizeActuals(raw: unknown): Actuals {
  const out: Actuals = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const idx = Number(key);
    if (!Number.isInteger(idx) || idx < 0 || idx > 11) continue;
    if (typeof value !== "object" || value === null) continue;
    const v = value as Record<string, unknown>;
    const month: MonthActuals = {
      b2b: clampValue(v.b2b, 100_000),
      glass: clampValue(v.glass, 100_000),
      airbnb: clampValue(v.airbnb, 100_000),
      private: clampValue(v.private, 100_000),
      hours: clampValue(v.hours, 1000),
    };
    if (Object.values(month).some((x) => x !== undefined)) out[idx] = month;
  }
  return out;
}

export function loadActuals(): Actuals {
  if (typeof window === "undefined") return {};
  try {
    return sanitizeActuals(JSON.parse(localStorage.getItem(ACTUALS_KEY) ?? "{}"));
  } catch {
    return {};
  }
}

export function saveActuals(actuals: Actuals): void {
  try {
    localStorage.setItem(ACTUALS_KEY, JSON.stringify(actuals));
  } catch {
    /* navigation privée / quota plein */
  }
}

export function totalCa(m: MonthActuals): number | undefined {
  const parts = [m.b2b, m.glass, m.airbnb, m.private].filter((x): x is number => x !== undefined);
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
}
