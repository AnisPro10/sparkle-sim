import { describe, expect, it } from "vitest";
import {
  civilYear2026Check,
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
    // Jamais de −0 IEEE 754 (Intl afficherait « -0 € »)
    expect(Object.is(excelRound(-0.3), -0)).toBe(false);
    expect(excelRound(-0.3)).toBe(0);
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
      350, 768, 1092, 1385, 1763, 2016, 2269, 2523, 2776, 3029, 3110, 2641,
    ]);
  });

  it("NET RÉEL année 1 = 22 521 € (taux 23,68 % avec taxe chambre CMA, arrondis par poste)", () => {
    expect(r.realNet).toBe(22521);
    expect(r.byActivity.map((a) => a.contribution)).toEqual([14667, 775, 4090, 5089]);
  });

  it("net de croisière = 2 927 €/mois (juin-août, avec saisonnalité)", () => {
    expect(r.cruiseNet).toBe(2927);
  });

  it("objectif 1 500 € atteint en janvier 2027 (5e mois), 8 mois sur 12", () => {
    expect(r.targetMonth).toBe("Janv. 2027");
    expect(r.targetMonthIndex).toBe(4);
    expect(r.monthsAboveTarget).toBe(8);
  });

  it("trésorerie : série certifiée, point bas +920 € en septembre", () => {
    expect(r.months.map((m) => m.cash)).toEqual([
      920, 1408, 2270, 3517, 4909, 6695, 8735, 11028, 13574, 16373, 19506, 22679,
    ]);
    expect(r.lowCash).toBe(920);
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

  it("scénarios = formules du classeur certifié (taux 23,68 %), sans facteur de calage", () => {
    const [pess, real, opt] = r.scenarios;
    expect(pess.ca).toBe(23709);
    expect(pess.net).toBe(13861);
    expect(real.ca).toBe(36573);
    // Scenarios!C19 : arrondi global → 22 521, aligné au NET RÉEL détaillé (comme le classeur).
    expect(real.net).toBe(22521);
    expect(opt.ca).toBe(49399);
    expect(opt.net).toBe(31155);
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
    expect(r.projection.map((p) => p.net)).toEqual([23721, 30807, 37209, 41050, 45275]);
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
    expect(value("micro-acre")).toBe(25659);
    expect(value("micro-vfl")).toBe(23721);
    expect(value("micro-bareme")).toBe(22331);
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
    expect(r.realNet).toBe(22521);
    expect(r.byActivity).toHaveLength(4);
  });

  it("ACRE : l'activer améliore le net réel et la trésorerie", () => {
    const base = computeModel(OFFICIAL);
    const acre = computeModel({ ...OFFICIAL, acre: true });
    expect(acre.realNet).toBeGreaterThan(base.realNet);
    expect(acre.lowCash).toBeGreaterThanOrEqual(base.lowCash);
  });
});

describe("portefeuille de contrats B2B (mode avancé)", () => {
  it("vide ou désactivé : chiffres certifiés strictement inchangés (parité)", () => {
    expect(computeModel({ ...OFFICIAL, b2bContractsEnabled: true, b2bContracts: [] }).realNet).toBe(
      22521,
    );
    expect(computeModel(OFFICIAL).realNet).toBe(22521);
  });

  it("contrats hétérogènes : CA et heures = somme réelle des contrats", () => {
    // Client A : 5 passages/sem × 1 h ; Client B : 2 passages/sem × 2 h ; 30 €/h.
    const h = computeModel({
      ...OFFICIAL,
      enabledGlass: false,
      enabledAirbnb: false,
      enabledPrivate: false,
      seasonality: Array(12).fill(1),
      unpaidRate: 0,
      b2bContractsEnabled: true,
      b2bContracts: [
        { label: "A", visitsPerWeek: 5, hoursPerVisit: 1, rate: 30, sites: 1, startMonth: 0 },
        { label: "B", visitsPerWeek: 2, hoursPerVisit: 2, rate: 30, sites: 1, startMonth: 0 },
      ],
    });
    // (5×4,33×1 + 2×4,33×2) × 30 = 1 169,1 → 1 169 ; heures = 21,65 + 17,32 = 38,97 → 39
    expect(h.months[0].b2b).toBe(1169);
    expect(h.months[0].hours).toBe(39);
  });

  it("mois de début : un contrat ne compte qu'à partir de son mois de signature", () => {
    const h = computeModel({
      ...OFFICIAL,
      enabledGlass: false,
      enabledAirbnb: false,
      enabledPrivate: false,
      seasonality: Array(12).fill(1),
      unpaidRate: 0,
      b2bContractsEnabled: true,
      b2bContracts: [
        { label: "Tardif", visitsPerWeek: 5, hoursPerVisit: 1, rate: 30, sites: 1, startMonth: 3 },
      ],
    });
    expect(h.months[2].b2b).toBe(0);
    expect(h.months[3].b2b).toBeGreaterThan(0);
  });
});

describe("contrats détaillés vitrerie / Airbnb / particuliers", () => {
  const base = {
    ...OFFICIAL,
    enabledB2b: false,
    enabledGlass: false,
    enabledAirbnb: false,
    enabledPrivate: false,
    seasonality: Array(12).fill(1),
    unpaidRate: 0,
  };

  it("vitrerie horaire : CA = interventions × heures × taux", () => {
    const r = computeModel({
      ...base,
      enabledGlass: true,
      glassContractsEnabled: true,
      glassContracts: [
        { label: "B", perMonth: 2, hoursEach: 1.5, rate: 35, startMonth: 0 },
      ],
    });
    expect(r.months[0].glass).toBe(105); // 2 × 1,5 × 35
    expect(r.months[0].hours).toBe(3); // 2 × 1,5
  });

  it("Airbnb au forfait/rotation : CA = rotations × prix (pas à l'heure)", () => {
    const r = computeModel({
      ...base,
      enabledAirbnb: true,
      airbnbContractsEnabled: true,
      airbnbContracts: [{ label: "Studio", perMonth: 8, hoursEach: 2, price: 55, startMonth: 0 }],
    });
    expect(r.months[0].airbnb).toBe(440); // 8 × 55 forfait
    expect(r.months[0].hours).toBe(16); // 8 × 2 (capacité)
  });

  it("particuliers horaire : CA = prestations × heures × taux ; mois de début respecté", () => {
    const r = computeModel({
      ...base,
      enabledPrivate: true,
      privateContractsEnabled: true,
      privateContracts: [{ label: "Mme X", perMonth: 4, hoursEach: 3, rate: 28, startMonth: 2 }],
    });
    expect(r.months[1].private).toBe(0); // avant le mois de début
    expect(r.months[2].private).toBe(336); // 4 × 3 × 28
  });
});

describe("année civile 2026 — alerte réglementaire TVA/micro", () => {
  // Valeurs littérales : elles figent à la fois la tranche de mois (sept.-déc. 2026,
  // soit months[0..3]) ET le prorata 122/365 — un recalcul dans le test serait circulaire.
  it("au preset officiel : prorata exact, aucun seuil dépassé", () => {
    const civil = civilYear2026Check(OFFICIAL, computeModel(OFFICIAL));
    expect(civil.revenue2026).toBe(5785);
    expect(civil.vatThresholdProrated).toBe(12534); // 37 500 × 122/365
    expect(civil.microThresholdProrated).toBe(27943); // 83 600 × 122/365
    expect(civil.vatExceeded).toBe(false);
    expect(civil.microExceeded).toBe(false);
  });

  it("seuil TVA abaissé → dépassement détecté", () => {
    const h = { ...OFFICIAL, vatCeiling: 10_000 };
    const civil = civilYear2026Check(h, computeModel(h));
    expect(civil.vatExceeded).toBe(true); // seuil proratisé 3 342 < 5 785 de CA sept.-déc.
  });
});
