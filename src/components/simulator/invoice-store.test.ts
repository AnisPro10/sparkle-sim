import { describe, expect, it } from "vitest";
import {
  computeTotals,
  defaultInvoice,
  missingRequired,
  sanitizeInvoice,
  DEFAULT_ISSUER,
  type InvoiceData,
} from "./invoice-store";

const base = (over: Partial<InvoiceData> = {}): InvoiceData => ({
  ...defaultInvoice("facture"),
  lines: [{ designation: "Entretien", qty: 8, unit: "passage", unitPriceHT: 72, vatRate: 20 }],
  ...over,
});

describe("computeTotals", () => {
  it("franchise (sans TVA) : net à payer = total HT", () => {
    const t = computeTotals(base());
    expect(t.totalHT).toBe(576);
    expect(t.totalVAT).toBe(0);
    expect(t.totalTTC).toBe(576);
    expect(t.netToPay).toBe(576);
  });

  it("avec TVA 20 % : TVA et TTC corrects", () => {
    const t = computeTotals(base({ vatEnabled: true }));
    expect(t.totalHT).toBe(576);
    expect(t.totalVAT).toBe(115.2);
    expect(t.totalTTC).toBe(691.2);
    expect(t.vatByRate).toHaveLength(1);
    expect(t.vatByRate[0]).toMatchObject({ rate: 20, vat: 115.2 });
  });

  it("remise et acompte déduits du net à payer", () => {
    const t = computeTotals(base({ discount: 76, deposit: 200 }));
    expect(t.totalHT).toBe(500); // 576 − 76
    expect(t.netToPay).toBe(300); // 500 − 200
  });

  it("frais de déplacement ajoutés au total HT", () => {
    const t = computeTotals(base({ travelFee: 24 }));
    expect(t.totalHT).toBe(600);
  });

  it("deux taux de TVA distincts regroupés", () => {
    const t = computeTotals(
      base({
        vatEnabled: true,
        lines: [
          { designation: "A", qty: 1, unit: "h", unitPriceHT: 100, vatRate: 20 },
          { designation: "B", qty: 1, unit: "h", unitPriceHT: 100, vatRate: 10 },
        ],
      }),
    );
    expect(t.vatByRate.map((r) => r.rate)).toEqual([10, 20]);
    expect(t.totalVAT).toBe(30); // 10 + 20
  });
});

describe("missingRequired", () => {
  it("liste les champs obligatoires vides (facture B2B)", () => {
    const m = missingRequired(defaultInvoice("facture"), {
      ...DEFAULT_ISSUER,
      siret: "",
      address: "",
    });
    expect(m).toContain("SIRET du prestataire");
    expect(m).toContain("Numéro du document");
    expect(m).toContain("SIREN du client (obligatoire B2B dès 09/2026)");
  });

  it("document complet : aucun manque", () => {
    const issuer = { ...DEFAULT_ISSUER, siret: "123", address: "x", rmCity: "RM" };
    const d = base({
      number: "FAC-2026-001",
      dateIssue: "2026-09-30",
      datePrestation: "2026-09-28",
      client: {
        kind: "pro",
        name: "ACME",
        address: "rue x",
        siren: "987",
        siteAddress: "",
        tvaIntra: "",
      },
    });
    expect(missingRequired(d, issuer)).toEqual([]);
  });
});

describe("sanitizeInvoice", () => {
  it("rejette les entrées dégénérées sans jeter", () => {
    expect(sanitizeInvoice(null).kind).toBe("facture");
    expect(sanitizeInvoice("corrompu").lines.length).toBeGreaterThan(0);
    const d = sanitizeInvoice({ lines: [{ qty: -5, unitPriceHT: "abc" }] });
    expect(d.lines[0].qty).toBe(0);
    expect(d.lines[0].unitPriceHT).toBe(0);
  });
});
