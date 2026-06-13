import type { Hypotheses, ModelResult } from "@/lib/simulator-model";
import { legalStatuses, MONTHS, percent } from "@/lib/simulator-model";

// Export d'un vrai classeur Excel (.xlsx) mis en forme : feuilles séparées, titres,
// en-têtes colorés, formats € / %, largeurs de colonnes, négatifs en rouge.
// exceljs est chargé à la demande (import dynamique) pour ne pas alourdir le bundle.

const BRAND = "FF1F3864"; // bleu nuit (thème L'AZ du Clean)
const TEAL = "FF0E6E8C"; // bleu canard
const LIGHT = "FFE3F1F6"; // teal très clair (fonds de section)
const ZEBRA = "FFF5F8FA";
const EUR = '#,##0 "€";[Red]-#,##0 "€"';
const INT = "#,##0";

type AnyWS = import("exceljs").Worksheet;
type AnyRow = import("exceljs").Row;

function title(ws: AnyWS, cols: number, text: string) {
  const r = ws.addRow([text]);
  ws.mergeCells(r.number, 1, r.number, cols);
  const c = r.getCell(1);
  c.font = { bold: true, size: 15, color: { argb: BRAND } };
  r.height = 24;
}

function subtitle(ws: AnyWS, cols: number, text: string) {
  const r = ws.addRow([text]);
  ws.mergeCells(r.number, 1, r.number, cols);
  r.getCell(1).font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
}

function section(ws: AnyWS, cols: number, text: string) {
  ws.addRow([]);
  const r = ws.addRow([text]);
  ws.mergeCells(r.number, 1, r.number, cols);
  const c = r.getCell(1);
  c.font = { bold: true, color: { argb: TEAL } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
  r.height = 18;
}

function header(ws: AnyWS, cells: string[]) {
  const r = ws.addRow(cells);
  r.eachCell((c, col) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    c.alignment = { horizontal: col === 1 ? "left" : "right" };
  });
  r.height = 17;
}

type RowOpts = { strong?: boolean; fmt?: string; zebra?: boolean };
function dataRow(ws: AnyWS, label: string, values: (number | string)[], opts: RowOpts = {}) {
  const r: AnyRow = ws.addRow([label, ...values]);
  r.eachCell((c, col) => {
    c.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
    if (opts.zebra) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    if (col === 1) {
      c.font = { bold: !!opts.strong, color: { argb: opts.strong ? "FF111827" : "FF374151" } };
      c.alignment = { horizontal: "left", wrapText: false };
    } else {
      c.alignment = { horizontal: "right" };
      c.font = { bold: !!opts.strong, color: { argb: "FF111827" } };
      if (typeof c.value === "number" && opts.fmt !== "raw") c.numFmt = opts.fmt ?? EUR;
    }
  });
}

/** Construit le classeur complet (7 feuilles) — séparé du téléchargement DOM pour
 *  être testable sous vitest/node (les valeurs exportées sont verrouillées par test). */
export async function buildWorkbook(
  h: Hypotheses,
  m: ModelResult,
): Promise<import("exceljs").Workbook> {
  const mod = (await import("exceljs")) as typeof import("exceljs") & {
    default?: typeof import("exceljs");
  };
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Simulateur L'AZ du Clean";

  // Taux dynamiques : socialRate/acreRate sont éditables dans les hypothèses — un
  // libellé en dur mentirait dès que l'utilisateur les modifie.
  const stamp = `micro-entreprise · ${h.acre ? `ACRE ${percent(h.acreRate)}` : `taux plein ${percent(h.socialRate)}`} · ${h.vfl ? "versement libératoire" : "impôt au barème"} · capacité ${h.capacity} h/mois`;

  // ---- Feuille 1 : Synthèse ----
  const wsS = wb.addWorksheet("Synthèse", { views: [{ showGridLines: false }] });
  wsS.columns = [{ width: 38 }, { width: 18 }];
  title(wsS, 2, "L'AZ du Clean — synthèse de la simulation");
  subtitle(wsS, 2, stamp);
  section(wsS, 2, "Indicateurs clés");
  header(wsS, ["Indicateur", "Valeur"]);
  dataRow(wsS, "Chiffre d'affaires année 1", [m.revenue], { strong: true });
  dataRow(wsS, "Net réel année 1", [m.realNet], { strong: true, zebra: true });
  dataRow(wsS, "Net mensuel moyen", [Math.round(m.realNet / 12)]);
  dataRow(wsS, "Net de croisière (juin-août)", [m.cruiseNet], { zebra: true });
  dataRow(wsS, "Objectif mensuel", [h.target]);
  dataRow(wsS, "Objectif atteint", [m.targetMonth ?? "non atteint"], { fmt: "raw", zebra: true });
  dataRow(wsS, "Point bas de trésorerie", [m.lowCash], { strong: true });
  dataRow(
    wsS,
    "Apport minimal / recommandé",
    [
      `${m.minimumContribution.toLocaleString("fr-FR")} € / ${m.recommendedContribution.toLocaleString("fr-FR")} €`,
    ],
    { fmt: "raw", zebra: true },
  );
  dataRow(wsS, "Occupation au pic", [percent(m.maxOccupancy)], { fmt: "raw" });
  dataRow(
    wsS,
    "Plafond micro / seuil TVA",
    [`${h.microCeiling.toLocaleString("fr-FR")} € / ${h.vatCeiling.toLocaleString("fr-FR")} €`],
    { fmt: "raw", zebra: true },
  );

  // ---- Feuille 2 : Compte de résultat par activité ----
  const wsR = wb.addWorksheet("Compte de résultat", { views: [{ showGridLines: false }] });
  wsR.columns = [
    { width: 30 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
  ];
  title(wsR, 6, "Compte de résultat analytique — année 1");
  subtitle(
    wsR,
    6,
    "Chaque activité porte ses prélèvements et charges variables (parité prévisionnel).",
  );
  section(wsR, 6, "Cascade par activité");
  header(wsR, ["Poste", ...m.byActivity.map((a) => a.label), "Total"]);
  const tot = (get: (a: (typeof m.byActivity)[number]) => number) =>
    m.byActivity.reduce((s, a) => s + get(a), 0);
  const A = (
    label: string,
    get: (a: (typeof m.byActivity)[number]) => number,
    opts: RowOpts = {},
  ) => dataRow(wsR, label, [...m.byActivity.map(get), tot(get)], opts);
  A("Chiffre d'affaires", (a) => a.ca, { strong: true });
  A("− Cotisations sociales", (a) => -a.cotisations, { zebra: true });
  A("− Impôt", (a) => -a.impot);
  A("− Formation (CFP)", (a) => -a.cfp, { zebra: true });
  A("− Produits & déplacements", (a) => -(a.produits + a.deplacements), { zebra: true });
  A("Contribution", (a) => a.contribution, { strong: true });
  section(wsR, 6, "Du total au net réel");
  header(wsR, ["Poste", "", "", "", "", "Montant"]);
  dataRow(wsR, "Total des contributions", ["", "", "", "", m.totalContribution], { strong: true });
  dataRow(wsR, "− Charges fixes (12 mois)", ["", "", "", "", -m.fixedYear], { zebra: true });
  dataRow(wsR, "− Matériel initial", ["", "", "", "", -h.capex]);
  dataRow(wsR, "NET RÉEL ANNÉE 1", ["", "", "", "", m.realNet], { strong: true });

  // ---- Feuille 3 : Plan d'activité 12 mois ----
  const wsP = wb.addWorksheet("Plan d'activité", { views: [{ showGridLines: false }] });
  wsP.columns = [{ width: 26 }, ...MONTHS.map(() => ({ width: 11 }))];
  title(wsP, 13, "Plan d'activité — 12 mois");
  subtitle(wsP, 13, "Septembre 2026 → août 2027.");
  section(wsP, 13, "Volumes");
  header(wsP, ["Série", ...MONTHS]);
  dataRow(wsP, "Sites B2B", h.sites, { fmt: INT });
  dataRow(wsP, "Saisonnalité B2B", h.seasonality, { fmt: "0.00", zebra: true });
  dataRow(wsP, "Vitrerie (interventions)", h.glassJobs, { fmt: INT });
  dataRow(wsP, "Airbnb (rotations)", h.airbnb, { fmt: INT, zebra: true });
  dataRow(wsP, "Particuliers (prestations)", h.privateJobs, { fmt: INT });
  section(wsP, 13, "Résultats");
  header(wsP, ["Indicateur", ...MONTHS]);
  dataRow(
    wsP,
    "CA mensuel",
    m.months.map((x) => x.ca),
  );
  dataRow(
    wsP,
    "Heures facturées",
    m.months.map((x) => x.hours),
    { fmt: INT, zebra: true },
  );
  dataRow(
    wsP,
    "Net de gestion",
    m.months.map((x) => x.netGestion),
    { strong: true },
  );

  // ---- Feuille 4 : Trésorerie ----
  const wsT = wb.addWorksheet("Trésorerie", { views: [{ showGridLines: false }] });
  wsT.columns = [{ width: 16 }, { width: 20 }, { width: 16 }];
  title(wsT, 3, "Trésorerie mois par mois");
  subtitle(
    wsT,
    3,
    `Apport ${h.contribution.toLocaleString("fr-FR")} € · point bas ${m.lowCash.toLocaleString("fr-FR")} € (${m.lowCashMonth})`,
  );
  section(wsT, 3, "Évolution sur 12 mois");
  header(wsT, ["Mois", "Trésorerie fin de mois", "Variation"]);
  dataRow(wsT, "Départ (apport)", [h.contribution, ""], {});
  let prev = h.contribution;
  m.months.forEach((p, i) => {
    dataRow(wsT, p.month, [p.cash, p.cash - prev], { zebra: i % 2 === 0 });
    prev = p.cash;
  });
  dataRow(wsT, "Point bas", [m.lowCash, ""], { strong: true });
  dataRow(wsT, "Créances clients fin d'année", [m.endReceivables, ""], {});

  // ---- Feuille 5 : Scénarios & projection ----
  const wsC = wb.addWorksheet("Scénarios & projection", { views: [{ showGridLines: false }] });
  wsC.columns = [
    { width: 30 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];
  title(wsC, 6, "Scénarios et projection 5 ans");
  section(wsC, 6, "Scénarios (formules de l'onglet Scénarios du prévisionnel)");
  header(wsC, ["Scénario", "CA", "Net", "", "", ""]);
  m.scenarios.forEach((s, i) =>
    dataRow(wsC, s.name, [s.ca, s.net, "", "", ""], {
      zebra: i % 2 === 0,
      strong: s.name === "Réaliste",
    }),
  );
  section(wsC, 6, "Projection 5 ans (net avant matériel initial)");
  header(wsC, ["Indicateur", ...m.projection.map((p) => p.year)]);
  dataRow(
    wsC,
    "Chiffre d'affaires",
    m.projection.map((p) => p.revenue),
  );
  dataRow(
    wsC,
    "Net",
    m.projection.map((p) => p.net),
    { strong: true, zebra: true },
  );
  dataRow(
    wsC,
    "TVA",
    m.projection.map((p) => (p.vat ? "à facturer" : "franchise")),
    { fmt: "raw" },
  );

  // ---- Feuille 6 : Statuts juridiques ----
  const wsJ = wb.addWorksheet("Statuts juridiques", { views: [{ showGridLines: false }] });
  wsJ.columns = [{ width: 36 }, { width: 16 }, { width: 14 }];
  title(wsJ, 3, "Comparateur de statuts juridiques");
  subtitle(
    wsJ,
    3,
    `Net en poche annuel pour ${m.revenue.toLocaleString("fr-FR")} € de CA (parité comparateur certifié).`,
  );
  section(wsJ, 3, "Classement");
  header(wsJ, ["Statut", "Net annuel", "Net mensuel"]);
  legalStatuses(h, m.revenue).forEach((s, i) =>
    dataRow(wsJ, `${i + 1}. ${s.name}`, [Math.round(s.value), s.monthly], {
      zebra: i % 2 === 0,
      strong: i === 0,
    }),
  );

  // ---- Feuille 7 : Hypothèses ----
  const wsH = wb.addWorksheet("Hypothèses", { views: [{ showGridLines: false }] });
  wsH.columns = [{ width: 38 }, { width: 18 }];
  title(wsH, 2, "Hypothèses de la simulation");
  section(wsH, 2, "Tarifs & volumes");
  header(wsH, ["Paramètre", "Valeur"]);
  const H = (label: string, v: number | string, fmt?: string, zebra = false) =>
    dataRow(wsH, label, [v], { fmt: fmt ?? "raw", zebra });
  H(
    "Activités actives",
    [
      h.enabledB2b && "B2B",
      h.enabledGlass && "vitrerie",
      h.enabledAirbnb && "Airbnb",
      h.enabledPrivate && "particuliers",
    ]
      .filter(Boolean)
      .join(", ") || "aucune",
  );
  H("Taux horaire B2B standard", h.hourlyB2B, EUR, true);
  H(
    "Part contrats annuels / remise",
    `${Math.round(h.annualShare * 100)} % / ${(h.annualDiscount * 100).toFixed(1)} %`,
    undefined,
    true,
  );
  H("Passages/semaine × heures/passage", `${h.visitsPerWeek} × ${h.hoursPerVisit} h`);
  H(
    "Vitrerie / Airbnb / particuliers",
    `${h.glassRate} €·h / ${h.airbnbPrice} € / ${h.privateRate} €·h`,
    undefined,
    true,
  );
  section(wsH, 2, "Prélèvements & charges");
  header(wsH, ["Paramètre", "Valeur"]);
  H("Cotisations sociales", percent(h.socialRate));
  H("ACRE", h.acre ? `activée (${percent(h.acreRate)})` : "non", undefined, true);
  H(
    "Versement libératoire",
    h.vfl ? `oui (${percent(h.taxRate)})` : `non — barème TMI ${percent(h.tmi)}`,
  );
  H("CFP", percent(h.cfpRate), undefined, true);
  H(
    "Produits / déplacements / impayés",
    `${percent(h.productsRate)} / ${percent(h.travelRate)} / ${percent(h.unpaidRate)}`,
  );
  H("Charges fixes mensuelles", h.fixedMonthly + h.renewalMonthly, EUR, true);
  section(wsH, 2, "Capital & seuils");
  header(wsH, ["Paramètre", "Valeur"]);
  H("Apport", h.contribution, EUR);
  H("Matériel initial", h.capex, EUR, true);
  H("Part B2B encaissée à 30 jours", percent(h.delayedShare));
  H("Objectif net mensuel", h.target, EUR, true);
  H("Capacité solo", `${h.capacity} h/mois`);
  H(
    "Plafond micro / seuil TVA",
    `${h.microCeiling.toLocaleString("fr-FR")} € / ${h.vatCeiling.toLocaleString("fr-FR")} €`,
    undefined,
    true,
  );
  H("Croissance années 2-5", h.growth.map((g) => `${Math.round(g * 100)} %`).join(" / "));

  return wb;
}

export async function downloadExcel(h: Hypotheses, m: ModelResult) {
  if (typeof window === "undefined") return;
  const wb = await buildWorkbook(h, m);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "simulation-az-du-clean.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
