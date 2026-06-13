import { BrandMark } from "@/components/brand/logo";
import { computeTotals, type InvoiceData, type Issuer } from "./invoice-store";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

function frDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Document A4 — devis ou facture. Conçu pour l'écran (aperçu) ET l'impression
 * (le CSS print masque le reste de la page et ne laisse que ce bloc).
 */
export function InvoiceDocument({ issuer, data }: { issuer: Issuer; data: InvoiceData }) {
  const t = computeTotals(data);
  const isDevis = data.kind === "devis";
  const isPro = data.client.kind === "pro";
  const title = isDevis ? "DEVIS" : "FACTURE";

  return (
    <div className="invoice-doc mx-auto bg-white text-[#1b2a44]" data-invoice-doc>
      {/* En-tête : logo + marque à gauche, type + n° à droite */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-[#1f3864] pb-4">
        <div className="flex items-center gap-3">
          <BrandMark size={56} className="shrink-0" />
          <div className="leading-tight">
            <div className="font-display text-xl font-bold text-[#1f3864]">{issuer.tradeName}</div>
            <div className="text-[11px] italic text-[#5b6b86]">La propreté qui tient parole.</div>
            <div className="mt-1 text-[10px] text-[#5b6b86]">
              {issuer.name} · EI
              {issuer.phone ? ` · ${issuer.phone}` : ""}
              {issuer.email ? ` · ${issuer.email}` : ""}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-extrabold tracking-wide text-[#1f3864]">
            {title}
          </div>
          <div className="mt-1 font-mono text-sm font-semibold">{data.number || "—"}</div>
          <div className="mt-1 text-[11px] text-[#5b6b86]">Émis le {frDate(data.dateIssue)}</div>
          {isDevis && (
            <div className="text-[11px] text-[#5b6b86]">Valable {data.validityDays} jours</div>
          )}
        </div>
      </header>

      {/* Émetteur / Client */}
      <section className="mt-5 grid grid-cols-2 gap-5 text-[11px]">
        <div className="rounded-md border border-[#dbe2ee] p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#1f3864]">
            Prestataire
          </div>
          <div className="font-semibold">
            {issuer.tradeName} — {issuer.name} · EI
          </div>
          {issuer.address && <div className="whitespace-pre-line">{issuer.address}</div>}
          {issuer.siret && <div>SIRET {issuer.siret}</div>}
          {issuer.rmCity && <div>{issuer.rmCity}</div>}
          {data.vatEnabled && issuer.tvaIntra && <div>TVA {issuer.tvaIntra}</div>}
          {issuer.rcPro && <div>RC pro : {issuer.rcPro}</div>}
        </div>
        <div className="rounded-md border border-[#dbe2ee] p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#1f3864]">
            Client {isPro ? "(professionnel)" : "(particulier)"}
          </div>
          <div className="font-semibold">{data.client.name || "—"}</div>
          {data.client.address && <div className="whitespace-pre-line">{data.client.address}</div>}
          {isPro && data.client.siren && <div>SIREN {data.client.siren}</div>}
          {data.vatEnabled && isPro && data.client.tvaIntra && (
            <div>TVA {data.client.tvaIntra}</div>
          )}
          {data.client.siteAddress && (
            <div className="mt-1 text-[#5b6b86]">
              Lieu d'intervention :{" "}
              <span className="whitespace-pre-line">{data.client.siteAddress}</span>
            </div>
          )}
        </div>
      </section>

      {/* Dates de prestation */}
      <div className="mt-3 text-[11px] text-[#5b6b86]">
        {data.kind === "facture" && <>Prestation réalisée le {frDate(data.datePrestation)}. </>}
        {data.startDate && <>Début prévu : {frDate(data.startDate)}.</>}
      </div>

      {/* Tableau des lignes */}
      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#1f3864] text-white">
            <th className="border border-[#1f3864] px-2 py-1.5 text-left">Désignation</th>
            <th className="border border-[#1f3864] px-2 py-1.5 text-right w-16">Qté</th>
            <th className="border border-[#1f3864] px-2 py-1.5 text-left w-16">Unité</th>
            <th className="border border-[#1f3864] px-2 py-1.5 text-right w-24">P.U. HT</th>
            {data.vatEnabled && (
              <th className="border border-[#1f3864] px-2 py-1.5 text-right w-14">TVA</th>
            )}
            <th className="border border-[#1f3864] px-2 py-1.5 text-right w-28">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {data.lines
            .filter((l) => l.designation.trim() || l.unitPriceHT > 0)
            .map((l, i) => (
              <tr key={i} className={i % 2 ? "bg-[#f3f6fb]" : ""}>
                <td className="border border-[#dbe2ee] px-2 py-1.5">{l.designation || "—"}</td>
                <td className="border border-[#dbe2ee] px-2 py-1.5 text-right font-mono tabular-nums">
                  {l.qty}
                </td>
                <td className="border border-[#dbe2ee] px-2 py-1.5">{l.unit}</td>
                <td className="border border-[#dbe2ee] px-2 py-1.5 text-right font-mono tabular-nums">
                  {eur(l.unitPriceHT)}
                </td>
                {data.vatEnabled && (
                  <td className="border border-[#dbe2ee] px-2 py-1.5 text-right font-mono tabular-nums">
                    {l.vatRate} %
                  </td>
                )}
                <td className="border border-[#dbe2ee] px-2 py-1.5 text-right font-mono tabular-nums">
                  {eur(l.qty * l.unitPriceHT)}
                </td>
              </tr>
            ))}
          {data.travelFee > 0 && (
            <tr>
              <td className="border border-[#dbe2ee] px-2 py-1.5">Frais de déplacement</td>
              <td className="border border-[#dbe2ee] px-2 py-1.5 text-right">1</td>
              <td className="border border-[#dbe2ee] px-2 py-1.5">forfait</td>
              <td className="border border-[#dbe2ee] px-2 py-1.5 text-right font-mono tabular-nums">
                {eur(data.travelFee)}
              </td>
              {data.vatEnabled && (
                <td className="border border-[#dbe2ee] px-2 py-1.5 text-right">20 %</td>
              )}
              <td className="border border-[#dbe2ee] px-2 py-1.5 text-right font-mono tabular-nums">
                {eur(data.travelFee)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="mt-3 flex justify-end">
        <div className="w-72 text-[12px]">
          {data.discount > 0 && <Row label="Remise" value={`− ${eur(data.discount)}`} />}
          <Row label="Total HT" value={eur(t.totalHT)} strong={!data.vatEnabled} />
          {data.vatEnabled &&
            t.vatByRate.map((r) => (
              <Row key={r.rate} label={`TVA ${r.rate} %`} value={eur(r.vat)} />
            ))}
          {data.vatEnabled && <Row label="Total TTC" value={eur(t.totalTTC)} strong />}
          {data.deposit > 0 && <Row label="Acompte versé" value={`− ${eur(data.deposit)}`} />}
          <div className="mt-1 flex items-center justify-between rounded-md bg-[#1f3864] px-3 py-2 text-white">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Net à payer</span>
            <span className="font-mono text-base font-bold tabular-nums">{eur(t.netToPay)}</span>
          </div>
        </div>
      </div>

      {/* Mention TVA / franchise */}
      <div className="mt-4 text-[10px] text-[#5b6b86]">
        {data.vatEnabled
          ? "TVA appliquée selon les taux indiqués."
          : "TVA non applicable, art. 293 B du CGI."}
      </div>

      {/* Conditions de règlement */}
      <section className="mt-3 grid grid-cols-2 gap-5 text-[10px] text-[#3a4a66]">
        <div>
          <div className="font-bold text-[#1f3864]">Conditions de règlement</div>
          <div>{data.paymentTerms}</div>
          <div>Pénalités de retard : {data.penaltyRate}.</div>
          {isPro && (
            <div>
              Indemnité forfaitaire pour frais de recouvrement : 40 € (clients professionnels).
            </div>
          )}
          {data.escompte && <div>{data.escompte}.</div>}
          {issuer.iban && <div className="mt-1">Règlement par virement — IBAN : {issuer.iban}</div>}
        </div>
        <div>
          {isDevis && (
            <div>
              <div className="font-bold text-[#1f3864]">Acceptation du devis</div>
              <div>Devis {data.devisFree ? "gratuit" : "payant"}.</div>
              <div className="mt-3">
                Date et signature précédées de la mention manuscrite
                <br />« Bon pour accord — devis reçu avant exécution » :
              </div>
              <div className="mt-6 border-t border-[#9fb0cc] pt-1 text-[#9fb0cc]">
                Signature du client
              </div>
            </div>
          )}
          {!isPro && data.mediator && (
            <div className="mt-1">
              <div className="font-bold text-[#1f3864]">Médiation de la consommation</div>
              <div className="whitespace-pre-line">{data.mediator}</div>
            </div>
          )}
        </div>
      </section>

      {data.notes && (
        <div className="mt-3 text-[10px] text-[#3a4a66]">
          <span className="font-bold text-[#1f3864]">Notes : </span>
          <span className="whitespace-pre-line">{data.notes}</span>
        </div>
      )}

      {/* Pied de page légal */}
      <footer className="mt-5 border-t border-[#dbe2ee] pt-2 text-center text-[9px] text-[#8493ad]">
        {issuer.tradeName} — {issuer.name}, entrepreneur individuel (EI)
        {issuer.siret ? ` · SIRET ${issuer.siret}` : ""}
        {issuer.rmCity ? ` · ${issuer.rmCity}` : ""}
        {issuer.address ? ` · ${issuer.address.replace(/\n/g, " ")}` : ""}
      </footer>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-[#e8edf5] py-1 ${
        strong ? "font-bold text-[#1f3864]" : ""
      }`}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
