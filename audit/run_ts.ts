// Harnais : exécute le vrai moteur TS sur des jeux d'hypothèses lus en JSON (argv[2])
// et émet le ModelResult + legalStatuses en JSON.
import { computeModel, legalStatuses, OFFICIAL, FIELD_REALISTIC, excelRound, roundUp100 } from "../src/lib/simulator-model";
import { readFileSync } from "fs";

const sets: Record<string, Record<string, unknown>> = JSON.parse(readFileSync(process.argv[2], "utf-8"));
const out: Record<string, unknown> = {};
for (const [name, patch] of Object.entries(sets)) {
  const base = name.startsWith("realiste") ? FIELD_REALISTIC : OFFICIAL;
  const h = { ...base, ...patch } as typeof OFFICIAL;
  const m = computeModel(h);
  out[name] = {
    months: m.months.map((r) => ({ b2b: r.b2b, glass: r.glass, airbnb: r.airbnb, private: r.private, ca: r.ca, hours: r.hours, netGestion: r.netGestion, receipts: r.receipts, cash: r.cash })),
    revenue: m.revenue,
    globalRate: m.globalRate,
    byActivity: m.byActivity,
    totalContribution: m.totalContribution,
    realNet: m.realNet,
    cruiseNet: m.cruiseNet,
    lowCash: m.lowCash,
    minimumContribution: m.minimumContribution,
    recommendedContribution: m.recommendedContribution,
    endReceivables: m.endReceivables,
    peakHours: m.peakHours,
    scenarios: m.scenarios,
    projection: m.projection,
    legal: legalStatuses(h, m.revenue).map((s) => ({ id: s.id, value: s.value })),
  };
}
// sanity sur les arrondis
out.__round_checks = {
  r_neg: excelRound(-2.5), r_pos: excelRound(2.5), r_2675: excelRound(2.675, 2),
  up_1079: roundUp100(1079), up_neg: roundUp100(-1000), up_eps: roundUp100(0.00000005),
};
console.log(JSON.stringify(out));
