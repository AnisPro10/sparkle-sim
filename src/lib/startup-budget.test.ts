import { describe, expect, it } from "vitest";
import { FORMALITY_BUDGET, FORMALITY_TOTAL } from "./startup-budget";

describe("budget formalités certifié (phase 8 de l'étude)", () => {
  it("total = 785 € — toute modification d'un poste doit être un acte conscient", () => {
    expect(FORMALITY_TOTAL).toBe(785);
    expect(FORMALITY_BUDGET.map((p) => p.amount)).toEqual([350, 0, 330, 65, 40]);
  });
});
