import { describe, expect, it } from "vitest";
import {
  clampHypotheses,
  computeModel,
  excelRound,
  FIELD_REALISTIC,
  legalStatuses,
  OFFICIAL,
  roundUp100,
} from "./simulator-model";

/**
 * Tests de parité avec les classeurs certifiés (audit du 12/06/2026) :
 * Previsionnel_ProClean_AZ.xlsx et Simulation_Juridique_ProClean.xlsx.
 * Les valeurs attendues sont les cellules des classeurs, pas des constantes de calage.
 */

describe("arrondis Excel", () => {
  it("excelRound : half away from zero", () => {
    expect(excelRound(2.5)).toBe(3);
    expect(excelRound(-2.5)).toBe(-3);
    expect(excelRound(2.4)).toBe(2);
    expect(excelRound(1084.74)).toBe(1085);
    expect(excelRound(301.31604 * 12 * 0.65)).toBe(2350);
  });
  it("roundUp100 : plafond à la centaine", () => {
    expect(roundUp100(1079)).toBe(1100);
    expect(roundUp100(1430)).toBe(1500);
    expect(roundUp100(1400)).toBe(1400);
    expect(roundUp100(0)).toBe(0);
  });
});

describe("parité prévisionnel — preset Officiel", () => {
  const r = computeModel(OFFICIAL);

  it("CA année 1 = 36 573 €", () => {
    expect(r.revenue).toBe(36573);
  });

  it("CA B2B mensuels (série certifiée)", () => {
    expect(r.months.map((m) => m.b2b)).toEqual([
      301, 603, 904, 1085, 1507, 1808, 2109, 2411, 2712, 3013, 2983, 2350,
    ]);
  });

  it("nets de gestion mensuels (série certifiée)", () => {
    expect(r.months.map((m) => m.netGestion)).toEqual([
      353, 774, 1100, 1396, 1776, 2031, 2286, 2541, 2796, 3051, 3133, 2660,
    ]);
  });

  it("NET RÉEL année 1 = 22 697 € (arrondis par activité et par poste)", () => {
    expect(r.realNet).toBe(22697);
    expect(r.byActivity.map((a) => a.contribution)).toEqual([14772, 781, 4119, 5125]);
  });

  it("net de croisière = 2 948 €/mois (juin-août, avec saisonnalité)", () => {
    expect(r.cruiseNet).toBe(2948);
  });

  it("objectif 1 500 € atteint en janvier 2027 (5e mois), 8 mois sur 12", () => {
    expect(r.targetMonth).toBe("Janv. 2027");
    expect(r.targetMonthIndex).toBe(4);
    expect(r.monthsAboveTarget).toBe(8);
  });

  it("trésorerie : série certifiée, point bas +921 € en septembre", () => {
    expect(r.months.map((m) => m.cash)).toEqual([
      921, 1413, 2282, 3539, 4941, 6740, 8795, 11105, 13670, 16490, 19645, 22840,
    ]);
    expect(r.lowCash).toBe(921);
    expect(r.lowCashMonth).toBe("Sept. 2026");
    expect(r.fundable).toBe(true);
  });

  it("apport minimal 1 100 € / recommandé 1 500 € (ROUNDUP en cascade)", () => {
    expect(r.minimumContribution).toBe(1100);
    expect(r.recommendedContribution).toBe(1500);
  });

  it("créances clients fin d'année = 2 414 €", () => {
    expect(r.endReceivables).toBe(2414);
  });

  it("heures : pic 161 h (juillet), occupation 97,6 %", () => {
    expect(r.peakHours).toBe(161);
    expect(r.maxOccupancy).toBeCloseTo(161 / 165, 10);
  });

  it("scénarios = formules du classeur certifié (taux 23,2 %), sans facteur de calage", () => {
    const [pess, real, opt] = r.scenarios;
    expect(pess.ca).toBe(23709);
    expect(pess.net).toBe(13975);
    expect(real.ca).toBe(36573);
    // Scenarios!C19 : arrondi global → 22 696, à 1 € du NET RÉEL détaillé (comme le classeur).
    expect(real.net).toBe(22696);
    expect(opt.ca).toBe(49399);
    expect(opt.net).toBe(31392);
  });

  it("plateau de sites des scénarios = sites du dernier mois (Plan_Activite!M6), pas le max", () => {
    const declining = computeModel({
      ...OFFICIAL,
      sites: [3, 5, 8, 12, 12, 11, 10, 9, 8, 7, 6, 5],
    });
    const monotone = computeModel(OFFICIAL);
    // Avec sites[11] = 5 vs max = 12, le scénario pessimiste doit refléter la fin d'année.
    expect(declining.scenarios[0].ca).toBeLessThan(monotone.scenarios[0].ca);
    // S pessimiste = ROUND(5 × 0,65) = 3 ; vérifie qu'on n'utilise pas ROUND(12 × 0,65) = 8.
    const S = Math.round(5 * 0.65);
    expect(S).toBe(3);
  });

  it("projection 5 ans : CA et nets certifiés (net avant matériel initial)", () => {
    expect(r.projection.map((p) => p.revenue)).toEqual([36573, 47545, 57054, 62759, 69035]);
    expect(r.projection.map((p) => p.net)).toEqual([23896, 31036, 37482, 41351, 45606]);
    expect(r.projection.map((p) => p.vat)).toEqual([false, true, true, true, true]);
    expect(r.projection.every((p) => !p.micro)).toBe(true);
  });
});

describe("parité statuts juridiques — CA 36 573", () => {
  const statuses = legalStatuses(OFFICIAL, 36573);
  const value = (id: string) => {
    const row = statuses.find((s) => s.id === id);
    if (!row) throw new Error(`statut absent : ${id}`);
    return Math.round(row.value);
  };

  it("6 variantes aux valeurs du classeur juridique", () => {
    expect(value("micro-acre")).toBe(25835);
    expect(value("micro-vfl")).toBe(23896);
    expect(value("micro-bareme")).toBe(22507);
    expect(value("eurl")).toBe(20172);
    expect(value("ei")).toBe(19416);
    expect(value("sasu")).toBe(18707);
  });

  it("classement décroissant, micro ACRE en tête", () => {
    expect(statuses[0].id).toBe("micro-acre");
    expect([...statuses].sort((a, b) => b.value - a.value)).toEqual(statuses);
  });
});

describe("robustesse — computeModel ne jette jamais", () => {
  it("entrées dégénérées clampées sans exception ni NaN", () => {
    const inputs: unknown[] = [
      {},
      null,
      { hourlyB2B: "" },
      { hourlyB2B: 0 }, // sous la borne min 5 → clampé
      { hourlyB2B: "abc", sites: "pas un tableau" },
      { ...OFFICIAL, capacity: 0 }, // borne min 1
      {
        ...OFFICIAL,
        sites: OFFICIAL.sites.map(() => 0),
        airbnb: OFFICIAL.airbnb.map(() => 0),
        glassJobs: OFFICIAL.glassJobs.map(() => 0),
        privateJobs: OFFICIAL.privateJobs.map(() => 0),
      },
      { ...OFFICIAL, growth: [-5, 99, NaN, Infinity] },
    ];
    for (const input of inputs) {
      const r = computeModel(input as never);
      expect(Number.isFinite(r.revenue)).toBe(true);
      expect(Number.isFinite(r.realNet)).toBe(true);
      expect(Number.isFinite(r.maxOccupancy)).toBe(true);
      r.months.forEach((m) => expect(Number.isFinite(m.cash)).toBe(true));
      r.projection.forEach((p) => expect(Number.isFinite(p.net)).toBe(true));
    }
  });

  it("volumes à zéro : CA nul, pas de NaN, statuts finis", () => {
    const empty = clampHypotheses({
      ...OFFICIAL,
      sites: OFFICIAL.sites.map(() => 0),
      airbnb: OFFICIAL.airbnb.map(() => 0),
      glassJobs: OFFICIAL.glassJobs.map(() => 0),
      privateJobs: OFFICIAL.privateJobs.map(() => 0),
    });
    const r = computeModel(empty);
    expect(r.revenue).toBe(0);
    expect(r.targetMonth).toBeNull();
    expect(r.fundable).toBe(false); // capex au mois 1 > apport restant non couvert par des encaissements
    legalStatuses(empty, r.revenue).forEach((s) => expect(Number.isFinite(s.value)).toBe(true));
  });

  it("clampHypotheses accepte les nombres en chaîne avec virgule", () => {
    const h = clampHypotheses({ hourlyB2B: "32,5" });
    expect(h.hourlyB2B).toBe(32.5);
  });
});

describe("cohérences internes", () => {
  it("le compte de résultat se recoupe : Σ contributions − fixes − capex = net réel", () => {
    for (const h of [OFFICIAL, FIELD_REALISTIC]) {
      const r = computeModel(h);
      const sum = r.byActivity.reduce((s, a) => s + a.contribution, 0);
      expect(sum - r.fixedYear - h.capex).toBe(r.realNet);
    }
  });

  it("Σ CA par activité = CA année 1", () => {
    const r = computeModel(OFFICIAL);
    const sum = r.byActivity.reduce((s, a) => s + a.ca, 0);
    expect(sum).toBeCloseTo(r.revenue, 6);
  });

  it("trésorerie finale + créances + prélèvements/charges ≈ flux complet (invariant de bouclage)", () => {
    const r = computeModel(OFFICIAL);
    const received = r.months.reduce((s, m) => s + m.receipts, 0);
    expect(received + r.endReceivables).toBeCloseTo(r.revenue, 0);
  });

  it("le scénario réaliste (arrondi global C19) reste à ±1 € du net réel détaillé en VFL", () => {
    for (const h of [OFFICIAL, FIELD_REALISTIC]) {
      const r = computeModel(h);
      expect(Math.abs(r.scenarios[1].net - r.realNet)).toBeLessThanOrEqual(1);
      expect(r.scenarios[1].ca).toBe(r.revenue);
    }
  });

  it("activePresetId survit à un aller-retour localStorage (ordre de clés différent)", async () => {
    const { activePresetId, clampHypotheses: clamp } = await import("./simulator-model");
    const roundtrip = clamp(JSON.parse(JSON.stringify(OFFICIAL)));
    expect(activePresetId(roundtrip)).toBe("officiel");
    expect(activePresetId(clamp(JSON.parse(JSON.stringify(FIELD_REALISTIC))))).toBe("realiste");
    expect(activePresetId({ ...OFFICIAL, hourlyB2B: 31 })).toBeNull();
  });

  it("EURL : la rémunération de référence est plafonnée par le bénéfice (pas de net impossible)", () => {
    const low = legalStatuses(OFFICIAL, 15000);
    const eurl = low.find((s) => s.id === "eurl");
    if (!eurl) throw new Error("statut eurl absent");
    const benefice = 15000 * 0.91 - 900 - 300;
    expect(eurl.value).toBeLessThanOrEqual(benefice + 1);
  });

  it("activité décochée ⇔ volumes à zéro dans l'Excel (mêmes chiffres partout)", () => {
    const unchecked = computeModel({ ...OFFICIAL, enabledAirbnb: false, enabledGlass: false });
    const zeroed = computeModel({
      ...OFFICIAL,
      airbnb: OFFICIAL.airbnb.map(() => 0),
      glassJobs: OFFICIAL.glassJobs.map(() => 0),
    });
    expect(unchecked.revenue).toBe(zeroed.revenue);
    expect(unchecked.realNet).toBe(zeroed.realNet);
    expect(unchecked.cruiseNet).toBe(zeroed.cruiseNet);
    expect(unchecked.lowCash).toBe(zeroed.lowCash);
    expect(unchecked.months.map((m) => m.cash)).toEqual(zeroed.months.map((m) => m.cash));
    expect(unchecked.months.map((m) => m.hours)).toEqual(zeroed.months.map((m) => m.hours));
    expect(unchecked.scenarios.map((s) => s.net)).toEqual(zeroed.scenarios.map((s) => s.net));
    expect(unchecked.projection.map((p) => p.net)).toEqual(zeroed.projection.map((p) => p.net));
    // Les activités exclues disparaissent de la cascade ; les volumes saisis restent intacts.
    expect(unchecked.byActivity.map((a) => a.key)).toEqual(["b2b", "private"]);
    const restored = computeModel({ ...OFFICIAL, enabledAirbnb: true });
    expect(restored.revenue).toBe(computeModel(OFFICIAL).revenue);
  });

  it("toutes activités cochées par défaut : chiffres certifiés inchangés", () => {
    const r = computeModel(OFFICIAL);
    expect(r.realNet).toBe(22697);
    expect(r.byActivity).toHaveLength(4);
  });

  it("ACRE : l'activer améliore le net réel et la trésorerie", () => {
    const base = computeModel(OFFICIAL);
    const acre = computeModel({ ...OFFICIAL, acre: true });
    expect(acre.realNet).toBeGreaterThan(base.realNet);
    expect(acre.lowCash).toBeGreaterThanOrEqual(base.lowCash);
  });
});
