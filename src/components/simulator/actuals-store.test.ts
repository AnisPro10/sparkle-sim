import { describe, expect, it } from "vitest";
import { sanitizeActuals, totalCa } from "./actuals-store";

// sanitizeActuals est la barrière de validation de l'import JSON et du localStorage
// du Pilotage : logique pure, testée sans DOM.

describe("sanitizeActuals", () => {
  it("ignore les index hors 0-11, les négatifs, NaN et les chaînes non numériques", () => {
    const out = sanitizeActuals({
      "-1": { b2b: 100 },
      "12": { b2b: 100 },
      "1.5": { b2b: 100 },
      "3": { b2b: -5, glass: NaN, airbnb: "abc", hours: 8 },
    });
    expect(Object.keys(out)).toEqual(["3"]);
    expect(out[3]).toEqual({ hours: 8 });
  });

  it("plafonne à 100 000 € (CA) et 1 000 (heures)", () => {
    const out = sanitizeActuals({ 0: { b2b: 1e308, hours: 99999 } });
    expect(out[0].b2b).toBe(100_000);
    expect(out[0].hours).toBe(1000);
  });

  it("un mois dont toutes les valeurs sont invalides est absent du résultat", () => {
    const out = sanitizeActuals({ 5: { b2b: "x", glass: -1 }, 6: null, 7: "texte" });
    expect(out).toEqual({});
  });

  it("entrées non-objet : jamais d'exception, résultat vide", () => {
    expect(sanitizeActuals(null)).toEqual({});
    expect(sanitizeActuals("corrompu")).toEqual({});
    expect(sanitizeActuals(42)).toEqual({});
    expect(sanitizeActuals([1, 2, 3])).toEqual({});
  });

  it("round-trip : une entrée valide ressort identique (JSON compris)", () => {
    const valid = { 0: { b2b: 1200, glass: 80 }, 11: { hours: 120.5 } };
    expect(sanitizeActuals(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });
});

describe("totalCa", () => {
  it("undefined si aucun champ CA saisi (les heures ne comptent pas)", () => {
    expect(totalCa({})).toBeUndefined();
    expect(totalCa({ hours: 100 })).toBeUndefined();
  });

  it("somme partielle des champs CA présents", () => {
    expect(totalCa({ b2b: 1000, airbnb: 250 })).toBe(1250);
    expect(totalCa({ glass: 0 })).toBe(0);
  });
});
