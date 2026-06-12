import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeModel, OFFICIAL } from "./simulator-model";

/**
 * Parité de bout en bout : audit/parite_e2e.py patche une copie du prévisionnel
 * Excel certifié avec un jeu d'hypothèses NON-défaut, recalcule toutes les formules
 * (paquet Python `formulas`) et dépose les résultats dans parite_e2e_attendu.json.
 * Ici, on rejoue les mêmes hypothèses dans computeModel : mêmes chiffres exigés.
 * Si une personne saisit les mêmes paramètres dans l'Excel et dans le simulateur,
 * elle DOIT retomber sur les mêmes montants.
 */

const GOLDEN = join(__dirname, "..", "..", "audit", "parite_e2e_attendu.json");

type Golden = {
  hypotheses_simulateur: {
    hourlyB2B: number;
    annualShare: number;
    acre: boolean;
    fixedMonthly: number;
    contribution: number;
    airbnbPrice: number;
    growth: number[];
  };
  excel: {
    ca_annee1: number;
    net_reel: number;
    net_mensuel_moyen: number;
    croisiere: number;
    point_bas: number;
    apport_minimal: number;
    apport_recommande: number;
    scenario_pessimiste_ca: number;
    scenario_realiste_ca: number;
    scenario_optimiste_ca: number;
    scenario_pessimiste_net: number;
    scenario_realiste_net: number;
    scenario_optimiste_net: number;
    projection_ca: number[];
    projection_net: number[];
  };
};

describe.skipIf(!existsSync(GOLDEN))(
  "parité E2E — Excel recalculé vs simulateur (jeu d'hypothèses non-défaut)",
  () => {
    const golden: Golden = JSON.parse(readFileSync(GOLDEN, "utf-8"));
    const r = computeModel({ ...OFFICIAL, ...golden.hypotheses_simulateur });
    const x = golden.excel;

    it("CA et net réel année 1", () => {
      expect(r.revenue).toBe(x.ca_annee1);
      expect(r.realNet).toBe(x.net_reel);
      expect(Math.round(r.realNet / 12)).toBe(x.net_mensuel_moyen);
    });

    it("croisière, trésorerie et apports", () => {
      expect(r.cruiseNet).toBe(x.croisiere);
      expect(r.lowCash).toBe(x.point_bas);
      expect(r.minimumContribution).toBe(x.apport_minimal);
      expect(r.recommendedContribution).toBe(x.apport_recommande);
    });

    it("scénarios pessimiste / réaliste / optimiste", () => {
      expect(r.scenarios.map((s) => s.ca)).toEqual([
        x.scenario_pessimiste_ca,
        x.scenario_realiste_ca,
        x.scenario_optimiste_ca,
      ]);
      expect(r.scenarios.map((s) => s.net)).toEqual([
        x.scenario_pessimiste_net,
        x.scenario_realiste_net,
        x.scenario_optimiste_net,
      ]);
    });

    it("projection 5 ans (CA et nets)", () => {
      expect(r.projection.map((p) => p.revenue)).toEqual(x.projection_ca);
      expect(r.projection.map((p) => p.net)).toEqual(x.projection_net);
    });
  },
);
