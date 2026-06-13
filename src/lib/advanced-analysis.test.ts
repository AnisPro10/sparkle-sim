import { describe, expect, it } from "vitest";
import {
  fullMonthNet,
  goalSeek,
  monteCarlo,
  retirementQuarters,
  sensitivityMatrix,
  tornado,
} from "./advanced-analysis";
import { computeModel, OFFICIAL, progressiveIncomeTax } from "./simulator-model";

describe("matrice de sensibilité — parité onglet Sensibilite", () => {
  it("au préréglage officiel, la grille reproduit celle du classeur (axes 6-18 × 26-34)", () => {
    const m = sensitivityMatrix(OFFICIAL);
    expect(m.rates).toEqual([26, 28, 30, 32, 34]);
    expect(m.rows.map((r) => r.sites)).toEqual([6, 9, 12, 15, 18]);
  });

  it("case réaliste 12 sites × 30 €/h = 3 620 € (croisière hors saisonnalité, taux 23,68 %)", () => {
    expect(fullMonthNet(OFFICIAL, 12, 30)).toBe(3620);
  });

  it("la matrice croît avec les sites et le taux", () => {
    const m = sensitivityMatrix(OFFICIAL);
    expect(m.rows[0].cells[0]).toBeLessThan(m.rows[4].cells[4]);
    expect(m.rows[2].cells[0]).toBeLessThan(m.rows[2].cells[4]);
  });
});

describe("options avancées neutres = parité certifiée intacte", () => {
  it("churn 0, inflation 0, barème off : chiffres certifiés inchangés", () => {
    const r = computeModel(OFFICIAL);
    expect(r.realNet).toBe(22521);
    expect(r.projection.map((p) => p.revenue)).toEqual([36573, 47545, 57054, 62759, 69035]);
    expect(r.projection.map((p) => p.net)).toEqual([23721, 30807, 37209, 41050, 45275]);
  });

  it("churn actif : le net baisse, les heures aussi", () => {
    const churned = computeModel({ ...OFFICIAL, churnRate: 0.1 });
    const base = computeModel(OFFICIAL);
    expect(churned.realNet).toBeLessThan(base.realNet);
    expect(churned.totalHours).toBeLessThan(base.totalHours);
  });

  it("inflation des prix : CA années 2-5 plus hauts ; inflation des charges : net rogné", () => {
    const inflated = computeModel({ ...OFFICIAL, inflationPrices: 0.02 });
    const base = computeModel(OFFICIAL);
    expect(inflated.projection[1].revenue).toBeGreaterThan(base.projection[1].revenue);
    expect(inflated.projection[0].revenue).toBe(base.projection[0].revenue); // an 1 inchangé
    const costly = computeModel({ ...OFFICIAL, inflationCosts: 0.05 });
    expect(costly.projection[4].net).toBeLessThan(base.projection[4].net);
  });

  it("barème progressif : ne change rien en VFL ; en barème, l'IR diffère de la TMI plate", () => {
    const vfl = computeModel({ ...OFFICIAL, progressiveTax: true });
    expect(vfl.realNet).toBe(22521); // VFL actif → option sans effet
    const flat = computeModel({ ...OFFICIAL, vfl: false });
    const progressive = computeModel({ ...OFFICIAL, vfl: false, progressiveTax: true });
    // base imposable 18 286 € : tranche 0 jusqu'à 11 600 € → IR progressif < TMI plate
    expect(progressive.realNet).toBeGreaterThan(flat.realNet);
  });

  it("barème IR 2026 verrouillé : impôt exact sur la base du preset officiel", () => {
    // 50 % × 36 573 = 18 286,5 € imposables : (18 286,5 − 11 600) × 11 % = 735,515 €
    expect(progressiveIncomeTax(18286.5)).toBeCloseTo(735.515, 3);
    expect(progressiveIncomeTax(11600)).toBe(0);
    expect(progressiveIncomeTax(0)).toBe(0);
  });
});

describe("tornado", () => {
  it("classé par amplitude décroissante, base = net certifié", () => {
    const t = tornado(OFFICIAL);
    expect(t.base).toBe(22521);
    for (let i = 1; i < t.items.length; i++) {
      expect(t.items[i - 1].span).toBeGreaterThanOrEqual(t.items[i].span);
    }
    // Le taux horaire ou les sites dominent toujours ce modèle
    expect(["Taux horaire B2B (±10 %)", "Sites B2B (±10 %)"]).toContain(t.items[0].label);
  });
});

describe("goal seek", () => {
  it("la solution trouvée atteint bien l'objectif (réinjection)", () => {
    const results = goalSeek(OFFICIAL, 3000);
    for (const r of results) {
      if (r.required !== null && r.achievedNet !== null) {
        expect(r.achievedNet).toBeGreaterThanOrEqual(3000);
      }
    }
    // 2 948 € de croisière au défaut : 3 000 € exigent un peu plus que l'existant
    const sites = results.find((r) => r.lever.includes("Sites"));
    expect(sites?.required).toBeGreaterThanOrEqual(12);
  });

  it("objectif déjà atteint → le levier courant suffit", () => {
    const results = goalSeek(OFFICIAL, 1500);
    const rate = results.find((r) => r.lever.includes("Taux horaire"));
    expect(rate?.required).not.toBeNull();
    expect(rate!.required!).toBeLessThanOrEqual(OFFICIAL.hourlyB2B);
  });

  it("objectif impossible → null", () => {
    const results = goalSeek(OFFICIAL, 50000);
    expect(results.some((r) => r.required === null)).toBe(true);
  });
});

describe("Monte-Carlo", () => {
  it("déterministe à seed égal, quantiles ordonnés, probabilités cohérentes", () => {
    const a = monteCarlo(OFFICIAL, 500, 42);
    const b = monteCarlo(OFFICIAL, 500, 42);
    expect(a.p50).toBe(b.p50);
    expect(a.p10).toBeLessThanOrEqual(a.p50);
    expect(a.p50).toBeLessThanOrEqual(a.p90);
    expect(a.probGoal).toBeGreaterThan(0.5); // le plan officiel dépasse l'objectif
    expect(a.probNegativeCash).toBeLessThan(0.5);
    expect(a.histogram.reduce((s, x) => s + x.count, 0)).toBe(500);
  });

  it("le couloir Monte-Carlo encadre le net certifié", () => {
    const mc = monteCarlo(OFFICIAL, 1000, 7);
    expect(mc.p10).toBeLessThan(22521);
    expect(mc.p90).toBeGreaterThan(22521);
  });
});

describe("droits sociaux", () => {
  it("trimestres de retraite selon le CA (barème 2026 : 3 564 € de CA par trimestre)", () => {
    expect(retirementQuarters(36573)).toBe(4);
    expect(retirementQuarters(14256)).toBe(4);
    expect(retirementQuarters(14255)).toBe(3);
    expect(retirementQuarters(10692)).toBe(3);
    expect(retirementQuarters(5000)).toBe(1);
    expect(retirementQuarters(0)).toBe(0);
  });
});
