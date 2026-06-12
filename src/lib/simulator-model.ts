import { z } from "zod";

export const MONTHS = ["Sept. 2026", "Oct. 2026", "Nov. 2026", "Déc. 2026", "Janv. 2027", "Févr. 2027", "Mars 2027", "Avr. 2027", "Mai 2027", "Juin 2027", "Juil. 2027", "Août 2027"] as const;

const bounded = (min: number, max: number) => z.number().finite().min(min).max(max);
export const hypothesesSchema = z.object({
  hourlyB2B: bounded(10, 100), annualShare: bounded(0, 1), annualDiscount: bounded(0, .5),
  visitsPerWeek: bounded(0, 14), hoursPerVisit: bounded(.25, 12), glassRate: bounded(10, 150),
  airbnbPrice: bounded(10, 500), privateRate: bounded(10, 100), privateHours: bounded(.5, 12),
  socialRate: bounded(0, .6), acreRate: bounded(0, .6), taxRate: bounded(0, .5), cfpRate: bounded(0, .1),
  acre: z.boolean(), vfl: z.boolean(), tmi: bounded(0, .6), productsRate: bounded(0, .5),
  travelRate: bounded(0, .5), unpaidRate: bounded(0, .5), fixedMonthly: bounded(0, 5000),
  renewalMonthly: bounded(0, 5000), contribution: bounded(0, 100000), capex: bounded(0, 100000),
  delayedShare: bounded(0, 1), target: bounded(0, 20000), capacity: bounded(1, 1000),
  microCeiling: bounded(1000, 500000), vatCeiling: bounded(1000, 500000),
  sites: z.array(bounded(0, 100)).length(12), seasonality: z.array(bounded(0, 2)).length(12),
  glassJobs: z.array(bounded(0, 100)).length(12), airbnb: z.array(bounded(0, 500)).length(12),
  privateJobs: z.array(bounded(0, 500)).length(12), growth: z.array(bounded(-.9, 3)).length(4),
});

export type Hypotheses = z.infer<typeof hypothesesSchema>;
export type MonthResult = { month: string; b2b: number; glass: number; airbnb: number; private: number; ca: number; hours: number; rate: number; net: number; receipts: number; cash: number; overloaded: boolean };
export type ModelResult = { months: MonthResult[]; revenue: number; realNet: number; cruiseNet: number; targetMonth: string | null; lowCash: number; lowCashMonth: string; minimumContribution: number; recommendedContribution: number; maxOccupancy: number; scenarios: { name: string; net: number }[]; projection: { year: string; revenue: number; net: number; vat: boolean; micro: boolean }[] };

export const OFFICIAL: Hypotheses = {
  hourlyB2B: 30, annualShare: .5, annualDiscount: .067, visitsPerWeek: 2, hoursPerVisit: 1.2,
  glassRate: 32, airbnbPrice: 75, privateRate: 30, privateHours: 3,
  socialRate: .212, acreRate: .159, taxRate: .017, cfpRate: .003, acre: false, vfl: true, tmi: .11,
  productsRate: .04, travelRate: .05, unpaidRate: 0, fixedMonthly: 75, renewalMonthly: 0,
  contribution: 2000, capex: 1200, delayedShare: 1, target: 1500, capacity: 165,
  microCeiling: 83600, vatCeiling: 37500,
  sites: [1,2,3,4,5,6,7,8,9,10,11,12], seasonality: [1,1,1,.9,1,1,1,1,1,1,.9,.65],
  glassJobs: [0,1,1,1,2,2,2,2,2,2,2,1], airbnb: [2,3,3,4,5,6,7,8,9,10,12,12],
  privateJobs: [2,4,6,8,8,8,8,8,8,8,8,8], growth: [.30,.20,.10,.10],
};

export const FIELD_REALISTIC: Hypotheses = { ...OFFICIAL, productsRate: .055, travelRate: .065, unpaidRate: .015, fixedMonthly: 95, renewalMonthly: 30 };
export const euro = (value: number, digits = 0) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: digits }).format(value);
export const percent = (value: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);

function monthlyRows(h: Hypotheses, volume = 1, rateDelta = 0) {
  const effectiveRate = (h.hourlyB2B + rateDelta) * (1 - h.annualShare * h.annualDiscount);
  return MONTHS.map((month, i) => {
    const sites = h.sites[i] * volume;
    const b2bHours = sites * h.visitsPerWeek * 4.33 * h.hoursPerVisit * h.seasonality[i];
    const glassHours = h.glassJobs[i] * volume * 2;
    const airbnbHours = h.airbnb[i] * volume * 2.5;
    const privateHours = h.privateJobs[i] * volume * h.privateHours;
    const b2b = b2bHours * effectiveRate * (1 - h.unpaidRate);
    const glass = glassHours * h.glassRate;
    const airbnb = h.airbnb[i] * volume * h.airbnbPrice;
    const privateRevenue = privateHours * h.privateRate;
    const ca = b2b + glass + airbnb + privateRevenue;
    const levy = (h.acre && i < 10 ? h.acreRate : h.socialRate) + h.cfpRate + (h.vfl ? h.taxRate : h.tmi * .5);
    const net = ca * (1 - levy - h.productsRate - h.travelRate) - h.fixedMonthly - h.renewalMonthly;
    return { month, b2b, glass, airbnb, private: privateRevenue, ca, hours: b2bHours + glassHours + airbnbHours + privateHours, rate: levy, net, receipts: 0, cash: 0, overloaded: false } satisfies MonthResult;
  });
}

function yearlyNet(h: Hypotheses, volume: number, rateDelta: number) {
  return monthlyRows(h, volume, rateDelta).reduce((sum, row) => sum + row.net, 0) - h.capex;
}

export function computeModel(input: Hypotheses): ModelResult {
  const h = hypothesesSchema.parse(input);
  const months = monthlyRows(h);
  let cash = h.contribution;
  months.forEach((row, i) => {
    const delayedCurrent = (row.b2b + row.glass) * (1 - h.delayedShare);
    const delayedPrevious = i ? (months[i - 1].b2b + months[i - 1].glass) * h.delayedShare : 0;
    row.receipts = delayedCurrent + delayedPrevious + row.airbnb + row.private;
    const levies = row.receipts * row.rate;
    cash += row.receipts - levies - row.ca * (h.productsRate + h.travelRate) - h.fixedMonthly - h.renewalMonthly - (i === 0 ? h.capex : 0);
    row.cash = cash;
    row.overloaded = row.hours > h.capacity;
  });
  const revenue = months.reduce((sum, row) => sum + row.ca, 0);
  const realNet = months.reduce((sum, row) => sum + row.net, 0) - h.capex;
  const cruiseNet = months.slice(9).reduce((sum, row) => sum + row.net, 0) / 3;
  const targetMonth = months.find((row) => row.net >= h.target)?.month ?? null;
  const low = months.reduce((a, b) => a.cash < b.cash ? a : b);
  const minimumContribution = Math.max(0, Math.ceil((h.contribution - low.cash) / 100) * 100);
  const projection = [{ year: "Année 1", revenue, net: realNet, vat: revenue > h.vatCeiling, micro: revenue > h.microCeiling }];
  h.growth.forEach((growth, i) => { const prev = projection[i].revenue; const next = prev * (1 + growth); const charges = next * (h.socialRate + h.taxRate + h.cfpRate + h.productsRate + h.travelRate) + h.fixedMonthly * 12 + 300; projection.push({ year: `Année ${i + 2}`, revenue: next, net: next - charges, vat: next > h.vatCeiling, micro: next > h.microCeiling }); });
  return {
    months, revenue, realNet, cruiseNet, targetMonth, lowCash: low.cash, lowCashMonth: low.month,
    minimumContribution, recommendedContribution: Math.ceil(minimumContribution * 1.3 / 100) * 100,
    maxOccupancy: Math.max(...months.map((m) => m.hours / h.capacity)),
    scenarios: [{ name: "Pessimiste", net: yearlyNet(h, .65, -2) }, { name: "Réaliste", net: realNet }, { name: "Optimiste", net: yearlyNet(h, 1.35, 1) }], projection,
  };
}

export function legalStatuses(h: Hypotheses, revenue: number) {
  const charges = revenue * (h.productsRate + h.travelRate) + h.fixedMonthly * 12 + 300;
  const micro = revenue - revenue * (h.socialRate + h.cfpRate + (h.vfl ? h.taxRate : h.tmi * .5)) - charges;
  const profit = revenue - charges; const tns = Math.max(profit * .32, 1300); const ei = profit - tns - Math.max(0, (profit - tns) * h.tmi);
  const eurl = Math.max(0, profit / 1.45); const sasu = Math.max(0, (profit - Math.min(profit, 42500) * .15 - Math.max(0, profit - 42500) * .25) * .686);
  return [{ name: "Micro + VFL", value: micro, note: "Simple, charges proportionnelles au CA" }, { name: "EURL", value: eurl, note: "Protection et rémunération TNS" }, { name: "EI au réel", value: ei, note: "Charges réelles déductibles" }, { name: "SASU", value: sasu, note: "Souple mais plus coûteuse" }].sort((a,b) => b.value-a.value);
}