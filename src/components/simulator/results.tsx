import type React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CAPACITY_CRITICAL,
  CHAMBER_RATE,
  euro,
  percent,
  safePercent,
  type Hypotheses,
  type ModelResult,
} from "@/lib/simulator-model";
import { InfoTerm } from "./info-term";

type Tone = "good" | "bad" | "neutral";

export function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
  badge,
  term,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  term?: string;
  badge?: { text: string; variant: "success" | "destructive" | "warning" | "secondary" };
}) {
  const text =
    tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground";
  const accent =
    tone === "good"
      ? "border-l-success"
      : tone === "bad"
        ? "border-l-destructive"
        : "border-l-primary";
  return (
    <Card className={cn("border-l-4", accent)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {term ? <InfoTerm term={term}>{label}</InfoTerm> : label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={cn("font-mono text-2xl font-semibold tabular-nums leading-tight", text)}>
          {value}
        </div>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
          {badge && (
            <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
              {badge.text}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      <Separator className="mt-2.5" />
    </div>
  );
}

export function Row({
  label,
  value,
  strong,
  accent,
  indent,
  tone,
  term,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
  indent?: boolean;
  tone?: "bad" | "good";
  term?: string;
}) {
  return (
    <div
      className={cn(
        "flex justify-between py-1.5 border-b border-border/60 last:border-0",
        indent && "pl-4",
        strong && "bg-muted/30 -mx-2 px-2 rounded",
      )}
    >
      <span
        className={cn(
          "text-sm",
          strong ? "text-foreground font-semibold" : "text-muted-foreground",
        )}
      >
        {term ? <InfoTerm term={term}>{label}</InfoTerm> : label}
      </span>
      <span
        className={cn(
          "text-sm font-mono tabular-nums",
          tone === "bad"
            ? "text-destructive"
            : tone === "good"
              ? "text-success"
              : accent
                ? "text-primary"
                : strong
                  ? "text-foreground"
                  : "text-muted-foreground",
          strong ? "font-bold" : "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Compte de résultat analytique — cascade par activité (parité prévisionnel)
// ============================================================================
export function CompteResultatView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const totalLevies = m.byActivity.reduce((s, a) => s + a.cotisations + a.impot + a.cfp, 0);
  const totalVariable = m.byActivity.reduce((s, a) => s + a.produits + a.deplacements, 0);
  const marginPerHour = m.totalHours > 0 ? m.totalContribution / m.totalHours : 0;
  return (
    <section>
      <SectionHead
        title="Compte de résultat & ratios"
        desc={`Micro-entreprise · chaque activité porte ses prélèvements et charges variables — la cascade de l'onglet Résultat du prévisionnel.`}
      />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              Cascade analytique (année 1)
            </div>
            <Row
              label="Chiffre d'affaires"
              term="Chiffre d'affaires (CA)"
              value={euro(m.revenue)}
              strong
            />
            <Row
              label="− Cotisations sociales"
              value={euro(-m.byActivity.reduce((s, a) => s + a.cotisations, 0))}
              indent
            />
            <Row
              label={h.vfl ? "− Versement libératoire" : "− Impôt au barème (50 % × TMI)"}
              term="Versement fiscal libératoire (VFL)"
              value={euro(-m.byActivity.reduce((s, a) => s + a.impot, 0))}
              indent
            />
            <Row
              label="− Formation (CFP) + taxe chambre (CMA)"
              term="CFP"
              value={euro(-m.byActivity.reduce((s, a) => s + a.cfp, 0))}
              indent
            />
            <Row
              label="− Produits & déplacements"
              term="Charges variables"
              value={euro(-totalVariable)}
              indent
            />
            <Row
              label="Total des contributions"
              term="Contribution (par activité)"
              value={euro(m.totalContribution)}
              strong
            />
            <Row
              label="− Charges fixes (12 mois)"
              term="Charges fixes"
              value={euro(-m.fixedYear)}
              indent
            />
            <Row
              label="− Matériel initial"
              term="CAPEX (matériel initial)"
              value={euro(-h.capex)}
              indent
            />
            <Row
              label="NET RÉEL ANNÉE 1"
              term="Net réel"
              value={euro(m.realNet)}
              strong
              accent
              tone={m.realNet < 0 ? "bad" : "good"}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Contribution par activité
              </div>
              {m.byActivity.map((a) => (
                <Row
                  key={a.key}
                  label={`${a.label} (${safePercent(a.ca, m.revenue)} du CA)`}
                  value={`${euro(a.contribution)} · ${safePercent(a.contribution, a.ca)}`}
                  tone={a.contribution < 0 ? "bad" : undefined}
                />
              ))}
              <Row
                label="Marge moyenne par heure facturée"
                value={`${marginPerHour.toFixed(2).replace(".", ",")} €/h`}
                strong
                accent
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Ratios & pilotage
              </div>
              <Row label="Net mensuel moyen" value={euro(Math.round(m.realNet / 12))} />
              <Row
                label="Net de croisière (juin-août)"
                term="Net de croisière"
                value={euro(m.cruiseNet)}
              />
              <Row
                label="Taux de prélèvement global"
                value={percent(m.globalRate)}
                term="Micro-entreprise"
              />
              <Row label="Marge nette (/ CA)" value={safePercent(m.realNet, m.revenue)} />
              <Row
                label="Point mort (heures/mois)"
                term="Point mort"
                value={
                  marginPerHour > 0
                    ? `${Math.ceil((h.fixedMonthly + h.renewalMonthly) / marginPerHour)} h`
                    : "—"
                }
              />
              <Row label="Heures facturées (année)" value={`${m.totalHours} h`} />
              <Row
                label="Occupation au pic"
                term="Taux d'occupation"
                value={`${percent(m.maxOccupancy)} (${m.peakHours} h)`}
                tone={m.maxOccupancy > CAPACITY_CRITICAL ? "bad" : undefined}
              />
              <Row
                label="Mois ≥ objectif"
                value={`${m.monthsAboveTarget} / 12`}
                tone={m.monthsAboveTarget >= 6 ? "good" : undefined}
              />
              <Row
                label="Trésorerie de clôture (fin août)"
                value={euro(m.months[11]?.cash ?? 0)}
                tone={(m.months[11]?.cash ?? 0) < 0 ? "bad" : "good"}
              />
              <Row label="Créances clients fin d'année" term="BFR" value={euro(m.endReceivables)} />
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
        Modèle micro-entreprise 2026 en parité avec le prévisionnel certifié (audit du 12/06/2026) :
        cotisations {percent(h.socialRate)} du CA encaissé
        {h.acre ? ` (ACRE ${percent(h.acreRate)})` : ""}, CFP {percent(h.cfpRate)}, taxe chambre CMA{" "}
        {percent(CHAMBER_RATE)},{" "}
        {h.vfl
          ? `versement libératoire ${percent(h.taxRate)}`
          : `impôt au barème (TMI ${percent(h.tmi)} sur 50 % du CA)`}
        . CFE exonérée l'année de création. À valider avec un expert-comptable.
      </p>
    </section>
  );
}
