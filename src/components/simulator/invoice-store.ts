// Module Facture / Devis — entièrement indépendant du moteur financier (aucun lien avec
// le prévisionnel ni la parité). Tout est saisi à la main et conservé sur l'appareil.

export type DocKind = "devis" | "facture";
export type ClientKind = "pro" | "particulier";

export type InvoiceLine = {
  designation: string;
  qty: number;
  unit: string; // h, m², passage, forfait…
  unitPriceHT: number;
  vatRate: number; // % — utilisé seulement si la TVA est activée
};

export type Issuer = {
  name: string; // nom de l'exploitant
  tradeName: string; // nom commercial
  address: string;
  siret: string;
  rmCity: string; // « RM <ville> » (artisan)
  rcPro: string;
  iban: string;
  email: string;
  phone: string;
  tvaIntra: string; // n° TVA intracommunautaire (si assujetti)
};

export type Client = {
  kind: ClientKind;
  name: string;
  address: string;
  siren: string; // client professionnel
  siteAddress: string; // adresse du site nettoyé si différente
  tvaIntra: string;
};

export type InvoiceData = {
  kind: DocKind;
  number: string;
  dateIssue: string; // AAAA-MM-JJ
  datePrestation: string; // facture
  validityDays: number; // devis
  startDate: string; // début de prestation prévu
  vatEnabled: boolean;
  client: Client;
  lines: InvoiceLine[];
  travelFee: number; // frais de déplacement HT
  discount: number; // remise globale HT (€)
  deposit: number; // acompte déjà versé (€)
  paymentTerms: string;
  penaltyRate: string;
  escompte: string;
  devisFree: boolean;
  mediator: string; // médiateur de la consommation (B2C)
  notes: string;
};

export const ISSUER_KEY = "az-clean-issuer-v1";
export const CLIENTS_KEY = "az-clean-clients-v1";
export const INVOICE_DRAFT_KEY = "az-clean-invoice-draft-v1";
export const INVOICE_COUNTER_KEY = "az-clean-invoice-counter-v1";

export const DEFAULT_ISSUER: Issuer = {
  name: "Anis Azgag",
  tradeName: "L'AZ du Clean",
  address: "Seine-Saint-Denis (93)",
  siret: "",
  rmCity: "RM Bobigny",
  rcPro: "",
  iban: "",
  email: "",
  phone: "",
  tvaIntra: "",
};

export function emptyClient(kind: ClientKind = "pro"): Client {
  return { kind, name: "", address: "", siren: "", siteAddress: "", tvaIntra: "" };
}

export function emptyLine(): InvoiceLine {
  return { designation: "", qty: 1, unit: "h", unitPriceHT: 0, vatRate: 20 };
}

export function defaultInvoice(kind: DocKind = "facture"): InvoiceData {
  return {
    kind,
    number: "",
    dateIssue: "",
    datePrestation: "",
    validityDays: 30,
    startDate: "",
    vatEnabled: false,
    client: emptyClient("pro"),
    lines: [emptyLine()],
    travelFee: 0,
    discount: 0,
    deposit: 0,
    paymentTerms: "Paiement à 30 jours par virement",
    penaltyRate: "3 × le taux d'intérêt légal",
    escompte: "Pas d'escompte pour paiement anticipé",
    devisFree: true,
    mediator: "",
    notes: "",
  };
}

const str = (v: unknown, max = 2000): string => (typeof v === "string" ? v.slice(0, max) : "");
const numv = (v: unknown, max = 100_000_000): number => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};
const bool = (v: unknown, d: boolean): boolean => (typeof v === "boolean" ? v : d);

export function sanitizeIssuer(raw: unknown): Issuer {
  const s = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  return {
    name: str(s.name, 120) || DEFAULT_ISSUER.name,
    tradeName: str(s.tradeName, 120) || DEFAULT_ISSUER.tradeName,
    address: str(s.address, 300),
    siret: str(s.siret, 40),
    rmCity: str(s.rmCity, 80),
    rcPro: str(s.rcPro, 200),
    iban: str(s.iban, 60),
    email: str(s.email, 120),
    phone: str(s.phone, 40),
    tvaIntra: str(s.tvaIntra, 40),
  };
}

export function sanitizeClient(raw: unknown): Client {
  const s = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  return {
    kind: s.kind === "particulier" ? "particulier" : "pro",
    name: str(s.name, 160),
    address: str(s.address, 300),
    siren: str(s.siren, 40),
    siteAddress: str(s.siteAddress, 300),
    tvaIntra: str(s.tvaIntra, 40),
  };
}

function sanitizeLine(raw: unknown): InvoiceLine {
  const s = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  return {
    designation: str(s.designation, 300),
    qty: numv(s.qty, 1_000_000),
    unit: str(s.unit, 20) || "h",
    unitPriceHT: numv(s.unitPriceHT),
    vatRate: numv(s.vatRate, 100),
  };
}

export function sanitizeInvoice(raw: unknown): InvoiceData {
  const s = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  const base = defaultInvoice(s.kind === "devis" ? "devis" : "facture");
  const lines =
    Array.isArray(s.lines) && s.lines.length ? s.lines.slice(0, 60).map(sanitizeLine) : base.lines;
  return {
    ...base,
    number: str(s.number, 40),
    dateIssue: str(s.dateIssue, 20),
    datePrestation: str(s.datePrestation, 20),
    validityDays: numv(s.validityDays, 3650) || 30,
    startDate: str(s.startDate, 20),
    vatEnabled: bool(s.vatEnabled, false),
    client: sanitizeClient(s.client),
    lines,
    travelFee: numv(s.travelFee),
    discount: numv(s.discount),
    deposit: numv(s.deposit),
    paymentTerms: str(s.paymentTerms, 300) || base.paymentTerms,
    penaltyRate: str(s.penaltyRate, 200) || base.penaltyRate,
    escompte: str(s.escompte, 200) || base.escompte,
    devisFree: bool(s.devisFree, true),
    mediator: str(s.mediator, 300),
    notes: str(s.notes, 1000),
  };
}

export function sanitizeClients(raw: unknown): Client[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 200)
    .map(sanitizeClient)
    .filter((c) => c.name.trim());
}

/* ---- localStorage (try/catch partout : navigation privée tolérée) ---- */
export function loadIssuer(): Issuer {
  if (typeof window === "undefined") return DEFAULT_ISSUER;
  try {
    const v = localStorage.getItem(ISSUER_KEY);
    return v ? sanitizeIssuer(JSON.parse(v)) : DEFAULT_ISSUER;
  } catch {
    return DEFAULT_ISSUER;
  }
}
export function saveIssuer(i: Issuer): void {
  try {
    localStorage.setItem(ISSUER_KEY, JSON.stringify(i));
  } catch {
    /* ignore */
  }
}
export function loadClients(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    const v = localStorage.getItem(CLIENTS_KEY);
    return v ? sanitizeClients(JSON.parse(v)) : [];
  } catch {
    return [];
  }
}
export function saveClients(c: Client[]): void {
  try {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
export function loadDraft(): InvoiceData | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(INVOICE_DRAFT_KEY);
    return v ? sanitizeInvoice(JSON.parse(v)) : null;
  } catch {
    return null;
  }
}
export function saveDraft(d: InvoiceData): void {
  try {
    localStorage.setItem(INVOICE_DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

/** Numéro séquentiel suggéré : DEV-AAAA-NNN / FAC-AAAA-NNN. Compteur par type et par année. */
export function nextNumber(kind: DocKind, year: string): string {
  const prefix = kind === "devis" ? "DEV" : "FAC";
  let counters: Record<string, number> = {};
  try {
    counters = JSON.parse(localStorage.getItem(INVOICE_COUNTER_KEY) ?? "{}") || {};
  } catch {
    counters = {};
  }
  const key = `${prefix}-${year}`;
  const n = (Number(counters[key]) || 0) + 1;
  return `${key}-${String(n).padStart(3, "0")}`;
}

export function bumpCounter(kind: DocKind, year: string): void {
  try {
    const counters = JSON.parse(localStorage.getItem(INVOICE_COUNTER_KEY) ?? "{}") || {};
    const key = `${kind === "devis" ? "DEV" : "FAC"}-${year}`;
    counters[key] = (Number(counters[key]) || 0) + 1;
    localStorage.setItem(INVOICE_COUNTER_KEY, JSON.stringify(counters));
  } catch {
    /* ignore */
  }
}

/* ---- Totaux ---- */
export type InvoiceTotals = {
  totalHT: number;
  vatByRate: { rate: number; base: number; vat: number }[];
  totalVAT: number;
  totalTTC: number;
  netToPay: number;
};

export function computeTotals(d: InvoiceData): InvoiceTotals {
  const lines = [...d.lines];
  const round2 = (x: number) => Math.round(x * 100) / 100;
  let totalHT = lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0) + d.travelFee;
  totalHT = round2(totalHT - d.discount);
  if (!d.vatEnabled) {
    const net = round2(totalHT - d.deposit);
    return { totalHT, vatByRate: [], totalVAT: 0, totalTTC: totalHT, netToPay: net };
  }
  // Base TVA par taux (la remise est répartie au prorata ; le déplacement à 20 %)
  const grossHT = lines.reduce((s, l) => s + l.qty * l.unitPriceHT, 0) + d.travelFee;
  const factor = grossHT > 0 ? totalHT / grossHT : 1;
  const map = new Map<number, number>();
  for (const l of lines) {
    map.set(l.vatRate, (map.get(l.vatRate) ?? 0) + l.qty * l.unitPriceHT * factor);
  }
  if (d.travelFee > 0) map.set(20, (map.get(20) ?? 0) + d.travelFee * factor);
  const vatByRate = [...map.entries()]
    .filter(([, base]) => base !== 0)
    .sort((a, b) => a[0] - b[0])
    .map(([rate, base]) => ({ rate, base: round2(base), vat: round2(base * (rate / 100)) }));
  const totalVAT = round2(vatByRate.reduce((s, r) => s + r.vat, 0));
  const totalTTC = round2(totalHT + totalVAT);
  const netToPay = round2(totalTTC - d.deposit);
  return { totalHT, vatByRate, totalVAT, totalTTC, netToPay };
}

/** Champs obligatoires manquants selon type de document, profil client et TVA. */
export function missingRequired(d: InvoiceData, issuer: Issuer): string[] {
  const miss: string[] = [];
  if (!issuer.address.trim()) miss.push("Adresse du prestataire");
  if (!issuer.siret.trim()) miss.push("SIRET du prestataire");
  if (!issuer.rmCity.trim()) miss.push("Immatriculation RM + ville");
  if (d.vatEnabled && !issuer.tvaIntra.trim()) miss.push("N° TVA intracommunautaire (prestataire)");
  if (!d.number.trim()) miss.push("Numéro du document");
  if (!d.dateIssue.trim()) miss.push("Date d'émission");
  if (d.kind === "facture" && !d.datePrestation.trim()) miss.push("Date de la prestation");
  if (d.kind === "devis" && !d.validityDays) miss.push("Durée de validité du devis");
  if (!d.client.name.trim()) miss.push("Nom / dénomination du client");
  if (!d.client.address.trim()) miss.push("Adresse du client");
  if (d.client.kind === "pro" && !d.client.siren.trim())
    miss.push("SIREN du client (obligatoire B2B dès 09/2026)");
  if (!d.lines.some((l) => l.designation.trim() && l.unitPriceHT > 0))
    miss.push("Au moins une ligne de prestation (désignation + prix)");
  return miss;
}
