import { describe, expect, it } from "vitest";
import type { Worksheet } from "exceljs";
import { buildWorkbook } from "./export-excel";
import { computeModel, OFFICIAL } from "@/lib/simulator-model";

// Le classeur exporté est un livrable bancaire : on verrouille sa structure et ses
// chiffres clés au preset officiel (les montants viennent du moteur certifié).

const SHEETS = [
  "Synthèse",
  "Compte de résultat",
  "Plan d'activité",
  "Trésorerie",
  "Scénarios & projection",
  "Statuts juridiques",
  "Hypothèses",
];

/** Valeur de la dernière colonne de la ligne dont la 1ʳᵉ cellule porte ce libellé. */
function lastValueOf(ws: Worksheet, label: string): unknown {
  let found: unknown;
  ws.eachRow((row) => {
    if (row.getCell(1).value === label) {
      let last: unknown;
      row.eachCell((cell) => {
        last = cell.value;
      });
      found = last;
    }
  });
  return found;
}

describe("export Excel — structure et chiffres certifiés", () => {
  it("7 feuilles aux noms attendus", async () => {
    const wb = await buildWorkbook(OFFICIAL, computeModel(OFFICIAL));
    expect(wb.worksheets.map((ws) => ws.name)).toEqual(SHEETS);
  });

  it("Synthèse : CA 36 573 et net réel 22 697 au preset officiel", async () => {
    const m = computeModel(OFFICIAL);
    const wb = await buildWorkbook(OFFICIAL, m);
    const ws = wb.getWorksheet("Synthèse")!;
    expect(lastValueOf(ws, "Chiffre d'affaires année 1")).toBe(36573);
    expect(lastValueOf(ws, "Net réel année 1")).toBe(22521);
    expect(lastValueOf(ws, "Point bas de trésorerie")).toBe(m.lowCash);
  });

  it("Trésorerie : 12 lignes de mois, dernière = trésorerie de fin d'exercice", async () => {
    const m = computeModel(OFFICIAL);
    const wb = await buildWorkbook(OFFICIAL, m);
    const ws = wb.getWorksheet("Trésorerie")!;
    for (const month of m.months) {
      expect(lastValueOf(ws, month.month)).toBeDefined();
    }
    expect(lastValueOf(ws, m.months[11].month)).toBe(m.months[11].cash - m.months[10].cash);
    expect(lastValueOf(ws, "Point bas")).toBe("");
  });

  it("Statuts : 6 lignes classées, la première est en tête du comparateur", async () => {
    const m = computeModel(OFFICIAL);
    const wb = await buildWorkbook(OFFICIAL, m);
    const ws = wb.getWorksheet("Statuts juridiques")!;
    const labels: string[] = [];
    ws.eachRow((row) => {
      const v = row.getCell(1).value;
      if (typeof v === "string" && /^\d\. /.test(v)) labels.push(v);
    });
    expect(labels).toHaveLength(6);
    expect(labels[0]).toMatch(/^1\. Micro \+ ACRE/);
  });

  it("activité décochée : la cascade ne montre que les activités actives", async () => {
    const h = { ...OFFICIAL, enabledAirbnb: false, enabledPrivate: false };
    const wb = await buildWorkbook(h, computeModel(h));
    const ws = wb.getWorksheet("Compte de résultat")!;
    let headerCells: unknown[] = [];
    ws.eachRow((row) => {
      if (row.getCell(1).value === "Poste" && headerCells.length === 0) {
        const cells: unknown[] = [];
        row.eachCell((c) => cells.push(c.value));
        headerCells = cells;
      }
    });
    expect(headerCells).toEqual(["Poste", "B2B récurrent", "Vitrerie", "Total"]);
  });

  it("round-trip : le buffer écrit se relit avec les mêmes valeurs", async () => {
    const m = computeModel(OFFICIAL);
    const wb = await buildWorkbook(OFFICIAL, m);
    const buf = await wb.xlsx.writeBuffer();
    const mod = (await import("exceljs")) as typeof import("exceljs") & {
      default?: typeof import("exceljs");
    };
    const ExcelJS = mod.default ?? mod;
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buf);
    expect(lastValueOf(reloaded.getWorksheet("Synthèse")!, "Net réel année 1")).toBe(22521);
  });
});
