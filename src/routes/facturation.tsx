import { useEffect, useId, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, Printer, Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionHead } from "@/components/simulator/results";
import { InvoiceDocument } from "@/components/simulator/invoice-document";
import {
  bumpCounter,
  type Client,
  type ClientKind,
  computeTotals,
  defaultInvoice,
  type DocKind,
  emptyLine,
  type InvoiceData,
  type Issuer,
  loadClients,
  loadDraft,
  loadIssuer,
  missingRequired,
  nextNumber,
  saveClients,
  saveDraft,
  saveIssuer,
} from "@/components/simulator/invoice-store";

export const Route = createFileRoute("/facturation")({
  head: () => ({
    meta: [
      { title: "Facture / Devis — L'AZ du Clean" },
      {
        name: "description",
        content:
          "Générez un devis ou une facture professionnelle conforme (mentions légales, TVA optionnelle) au format A4 imprimable.",
      },
    ],
  }),
  component: FacturationPage,
});

/* ---------- petits champs ---------- */
function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  area,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  area?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-xs font-medium text-foreground/80"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {area ? (
        <textarea
          id={id}
          value={value}
          rows={2}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  required,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
  step?: number;
}) {
  const id = useId();
  const [raw, setRaw] = useState(String(value));
  useEffect(() => setRaw(String(value)), [value]);
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-xs font-medium text-foreground/80"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = Number(e.target.value.replace(",", "."));
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-right text-sm font-mono tabular-nums outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded px-3 py-1 text-sm font-semibold transition-colors",
            value === o.v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FacturationPage() {
  const [issuer, setIssuer] = useState<Issuer>(loadIssuer);
  const [data, setData] = useState<InvoiceData>(() => loadDraft() ?? defaultInvoice("facture"));
  const [clients, setClients] = useState<Client[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [printReq, setPrintReq] = useState(false);

  // Hydratation différée (SSR → valeurs par défaut, état réel après montage)
  useEffect(() => {
    setIssuer(loadIssuer());
    const d = loadDraft();
    if (d) setData(d);
    setClients(loadClients());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveIssuer(issuer);
  }, [issuer, hydrated]);
  useEffect(() => {
    if (hydrated) saveDraft(data);
  }, [data, hydrated]);

  useEffect(() => {
    if (printReq) {
      window.print();
      setPrintReq(false);
    }
  }, [printReq]);

  const totals = useMemo(() => computeTotals(data), [data]);
  const missing = useMemo(() => missingRequired(data, issuer), [data, issuer]);

  const setIssuerField = (k: keyof Issuer, v: string) => setIssuer((o) => ({ ...o, [k]: v }));
  const setField = <K extends keyof InvoiceData>(k: K, v: InvoiceData[K]) =>
    setData((o) => ({ ...o, [k]: v }));
  const setClientField = (k: keyof Client, v: string) =>
    setData((o) => ({ ...o, client: { ...o.client, [k]: v } }));
  const setLine = (i: number, patch: Partial<InvoiceData["lines"][number]>) =>
    setData((o) => ({ ...o, lines: o.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  const genNumber = () => {
    const year = (data.dateIssue || "2026").slice(0, 4) || "2026";
    setField("number", nextNumber(data.kind, year));
  };

  const saveCurrentClient = () => {
    if (!data.client.name.trim()) {
      toast.error("Renseignez le nom du client avant de l'enregistrer");
      return;
    }
    setClients((old) => {
      const next = [...old.filter((c) => c.name !== data.client.name), { ...data.client }];
      saveClients(next);
      return next;
    });
    toast.success("Client enregistré");
  };

  const loadClientByName = (name: string) => {
    const c = clients.find((x) => x.name === name);
    if (c) setField("client", { ...c });
  };

  const deleteClient = (name: string) => {
    setClients((old) => {
      const next = old.filter((c) => c.name !== name);
      saveClients(next);
      return next;
    });
  };

  const printAs = (kind: DocKind) => {
    if (missing.length) {
      toast.warning(`${missing.length} champ(s) obligatoire(s) manquant(s)`);
    }
    if (data.kind !== kind) setField("kind", kind);
    if (!data.number.trim()) {
      const year = (data.dateIssue || "2026").slice(0, 4) || "2026";
      setField("number", nextNumber(kind, year));
    }
    bumpCounter(kind, (data.dateIssue || "2026").slice(0, 4) || "2026");
    setPrintReq(true);
  };

  const isPro = data.client.kind === "pro";

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <SectionHead
          title="Facture / Devis"
          desc="Remplissez les cellules : l'aperçu A4 se met à jour en direct. Les champs marqués d'un astérisque (*) sont obligatoires selon le type de document et le profil du client. Aucune donnée ne quitte votre appareil."
        />
      </div>

      {/* Barre de contrôle */}
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Document</span>
            <Seg<DocKind>
              value={data.kind}
              onChange={(v) => setField("kind", v)}
              options={[
                { v: "devis", label: "Devis" },
                { v: "facture", label: "Facture" },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Client</span>
            <Seg<ClientKind>
              value={data.client.kind}
              onChange={(v) => setClientField("kind", v)}
              options={[
                { v: "pro", label: "Professionnel" },
                { v: "particulier", label: "Particulier" },
              ]}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.vatEnabled}
              onChange={(e) => setField("vatEnabled", e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Appliquer la TVA
          </label>
          {!data.vatEnabled && (
            <span className="text-[11px] text-muted-foreground">
              Franchise : « TVA non applicable, art. 293 B du CGI »
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 print:block">
        {/* ---------- Formulaire ---------- */}
        <div className="space-y-5 print:hidden">
          {/* Prestataire */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="font-display text-sm font-semibold text-primary">
                Prestataire (mémorisé)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Nom de l'exploitant"
                  required
                  value={issuer.name}
                  onChange={(v) => setIssuerField("name", v)}
                />
                <TextField
                  label="Nom commercial"
                  value={issuer.tradeName}
                  onChange={(v) => setIssuerField("tradeName", v)}
                />
              </div>
              <TextField
                label="Adresse"
                required
                area
                value={issuer.address}
                onChange={(v) => setIssuerField("address", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="SIRET"
                  required
                  value={issuer.siret}
                  onChange={(v) => setIssuerField("siret", v)}
                  placeholder="14 chiffres"
                />
                <TextField
                  label="Immatriculation (RM + ville)"
                  required
                  value={issuer.rmCity}
                  onChange={(v) => setIssuerField("rmCity", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Téléphone"
                  value={issuer.phone}
                  onChange={(v) => setIssuerField("phone", v)}
                />
                <TextField
                  label="E-mail"
                  value={issuer.email}
                  onChange={(v) => setIssuerField("email", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="RC pro (assureur)"
                  value={issuer.rcPro}
                  onChange={(v) => setIssuerField("rcPro", v)}
                />
                <TextField
                  label="IBAN"
                  value={issuer.iban}
                  onChange={(v) => setIssuerField("iban", v)}
                />
              </div>
              {data.vatEnabled && (
                <TextField
                  label="N° TVA intracommunautaire"
                  required
                  value={issuer.tvaIntra}
                  onChange={(v) => setIssuerField("tvaIntra", v)}
                />
              )}
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-primary">Client</h3>
                <div className="flex items-center gap-2">
                  {clients.length > 0 && (
                    <select
                      onChange={(e) => e.target.value && loadClientByName(e.target.value)}
                      defaultValue=""
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      aria-label="Charger un client enregistré"
                    >
                      <option value="">Charger un client…</option>
                      {clients.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={saveCurrentClient}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Enregistrer
                  </Button>
                </div>
              </div>
              <TextField
                label={isPro ? "Dénomination" : "Nom et prénom"}
                required
                value={data.client.name}
                onChange={(v) => setClientField("name", v)}
              />
              <TextField
                label="Adresse"
                required
                area
                value={data.client.address}
                onChange={(v) => setClientField("address", v)}
              />
              {isPro && (
                <TextField
                  label="SIREN du client"
                  required
                  value={data.client.siren}
                  onChange={(v) => setClientField("siren", v)}
                />
              )}
              {data.vatEnabled && isPro && (
                <TextField
                  label="N° TVA client"
                  value={data.client.tvaIntra}
                  onChange={(v) => setClientField("tvaIntra", v)}
                />
              )}
              <TextField
                label="Lieu d'intervention (si différent)"
                area
                value={data.client.siteAddress}
                onChange={(v) => setClientField("siteAddress", v)}
              />
              {clients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {clients.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]"
                    >
                      {c.name}
                      <button
                        onClick={() => deleteClient(c.name)}
                        aria-label={`Supprimer ${c.name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="font-display text-sm font-semibold text-primary">Document</h3>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    label="Numéro"
                    required
                    value={data.number}
                    onChange={(v) => setField("number", v)}
                    placeholder="FAC-2026-001"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={genNumber}>
                  Générer le n°
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Date d'émission"
                  required
                  type="date"
                  value={data.dateIssue}
                  onChange={(v) => setField("dateIssue", v)}
                />
                {data.kind === "facture" ? (
                  <TextField
                    label="Date de la prestation"
                    required
                    type="date"
                    value={data.datePrestation}
                    onChange={(v) => setField("datePrestation", v)}
                  />
                ) : (
                  <NumField
                    label="Validité (jours)"
                    required
                    value={data.validityDays}
                    onChange={(v) => setField("validityDays", v)}
                  />
                )}
              </div>
              <TextField
                label="Début de prestation prévu (option)"
                type="date"
                value={data.startDate}
                onChange={(v) => setField("startDate", v)}
              />
            </CardContent>
          </Card>

          {/* Lignes */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="font-display text-sm font-semibold text-primary">Prestations *</h3>
              {data.lines.map((l, i) => (
                <div key={i} className="rounded-md border border-border p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Ligne {i + 1}
                    </span>
                    {data.lines.length > 1 && (
                      <button
                        onClick={() =>
                          setField(
                            "lines",
                            data.lines.filter((_, j) => j !== i),
                          )
                        }
                        aria-label={`Supprimer la ligne ${i + 1}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <TextField
                    label="Désignation"
                    value={l.designation}
                    onChange={(v) => setLine(i, { designation: v })}
                    placeholder="Entretien bureaux — passage hebdomadaire"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <NumField
                      label="Quantité"
                      value={l.qty}
                      onChange={(v) => setLine(i, { qty: v })}
                      step={0.5}
                    />
                    <TextField
                      label="Unité"
                      value={l.unit}
                      onChange={(v) => setLine(i, { unit: v })}
                      placeholder="h / m² / passage"
                    />
                    <NumField
                      label="P.U. HT"
                      value={l.unitPriceHT}
                      onChange={(v) => setLine(i, { unitPriceHT: v })}
                      step={1}
                    />
                    {data.vatEnabled && (
                      <NumField
                        label="TVA %"
                        value={l.vatRate}
                        onChange={(v) => setLine(i, { vatRate: v })}
                        step={0.5}
                      />
                    )}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setField("lines", [...data.lines, emptyLine()])}
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
              </Button>
              <div className="grid grid-cols-3 gap-3">
                <NumField
                  label="Frais déplacement HT"
                  value={data.travelFee}
                  onChange={(v) => setField("travelFee", v)}
                />
                <NumField
                  label="Remise HT (€)"
                  value={data.discount}
                  onChange={(v) => setField("discount", v)}
                />
                <NumField
                  label="Acompte versé (€)"
                  value={data.deposit}
                  onChange={(v) => setField("deposit", v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="font-display text-sm font-semibold text-primary">
                Conditions & mentions
              </h3>
              <TextField
                label="Conditions de règlement"
                value={data.paymentTerms}
                onChange={(v) => setField("paymentTerms", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Pénalités de retard"
                  value={data.penaltyRate}
                  onChange={(v) => setField("penaltyRate", v)}
                />
                <TextField
                  label="Escompte"
                  value={data.escompte}
                  onChange={(v) => setField("escompte", v)}
                />
              </div>
              {data.kind === "devis" && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.devisFree}
                    onChange={(e) => setField("devisFree", e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Devis gratuit
                </label>
              )}
              {!isPro && (
                <TextField
                  label="Médiateur de la consommation (B2C)"
                  area
                  value={data.mediator}
                  onChange={(v) => setField("mediator", v)}
                  placeholder="Nom + site du médiateur agréé"
                />
              )}
              <TextField
                label="Notes"
                area
                value={data.notes}
                onChange={(v) => setField("notes", v)}
              />
            </CardContent>
          </Card>
        </div>

        {/* ---------- Aperçu A4 ---------- */}
        <div className="lg:sticky lg:top-20 lg:self-start print:static">
          {missing.length > 0 && (
            <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs print:hidden">
              <span className="font-semibold">Champs obligatoires manquants : </span>
              {missing.join(", ")}.
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-border bg-white p-3 shadow-sm print:overflow-visible print:border-0 print:p-0 print:shadow-none">
            <InvoiceDocument issuer={issuer} data={data} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" className="gap-2" onClick={() => printAs("devis")}>
              <FileText className="h-4 w-4" /> Imprimer le devis
            </Button>
            <Button className="gap-2" onClick={() => printAs("facture")}>
              <Printer className="h-4 w-4" /> Imprimer la facture (PDF)
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-muted-foreground"
              onClick={() => {
                setData(defaultInvoice(data.kind));
                toast.success("Document réinitialisé");
              }}
            >
              <Save className="h-4 w-4" /> Nouveau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
