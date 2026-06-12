import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CFE_YEAR2,
  euro,
  legalStatuses,
  safePercent,
  type Hypotheses,
  type ModelResult,
} from "@/lib/simulator-model";
import { SectionHead } from "./results";
import { InfoTerm } from "./info-term";

// Graphe « football field » : net en poche par statut, barres horizontales (CSS pur).
function FootballField({ rows }: { rows: ReturnType<typeof legalStatuses> }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="mb-5 space-y-1.5" role="img" aria-label="Net en poche annuel par statut">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Net en poche annuel
      </div>
      {rows.map((r, i) => {
        const w = (Math.abs(r.value) / maxAbs) * 100;
        return (
          <div key={r.id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "w-52 shrink-0 truncate",
                i === 0 ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {r.name}
            </span>
            <div className="relative flex-1 h-5 rounded bg-muted/40">
              <div
                className={cn(
                  "absolute inset-y-1 left-0 rounded-sm",
                  r.value >= 0 ? "bg-success" : "bg-destructive",
                  i === 0 && "ring-2 ring-foreground/30",
                )}
                style={{ width: `${Math.max(2, w)}%` }}
              />
            </div>
            <span
              className={cn(
                "w-20 shrink-0 text-right font-mono tabular-nums",
                r.value >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {euro(Math.round(r.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function StatusesView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const statuses = legalStatuses(h, m.revenue);
  return (
    <section>
      <SectionHead
        title="Quel statut juridique ?"
        desc={`Net en poche annuel pour ${euro(m.revenue)} de CA — formules vérifiées cellule par cellule contre le comparateur juridique (audit du 12/06/2026).`}
      />

      <Card className="mb-5">
        <CardContent className="p-5">
          <FootballField rows={statuses} />
          <p className="text-[11px] text-muted-foreground leading-snug">
            Convention du comparateur : la <InfoTerm term="Micro-entreprise">micro</InfoTerm> est
            simulée sur l'année de création (sans <InfoTerm term="CFE">CFE</InfoTerm>) ;{" "}
            <InfoTerm term="EI au réel">EI</InfoTerm>, <InfoTerm term="EURL">EURL</InfoTerm> et{" "}
            <InfoTerm term="SASU">SASU</InfoTerm> en année type avec CFE de {euro(CFE_YEAR2)}.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statuses.map((s, i) => (
          <Card key={s.id} className={i === 0 ? "border-primary" : ""}>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <span className="grid size-7 place-content-center rounded-full bg-secondary text-xs font-bold">
                  {i + 1}
                </span>
                {i === 0 && <Badge variant="success">Meilleur net</Badge>}
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{s.name}</h3>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                {euro(Math.round(s.value))}
              </p>
              <p className="text-xs text-muted-foreground">
                net en poche / an · {euro(s.monthly)} / mois · {safePercent(s.value, m.revenue)} du
                CA
              </p>
              <div className="my-4 h-px bg-border" />
              <p className="text-sm text-muted-foreground leading-relaxed">{s.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardContent className="grid gap-5 p-5 md:grid-cols-3">
          <div>
            <p className="font-semibold">Pourquoi la micro gagne ici</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Avec {safePercent(h.productsRate + h.travelRate, 1)} de charges réelles seulement,
              l'abattement forfaitaire de 50 % bat la déduction au réel. La{" "}
              <InfoTerm term="Bascule en société">bascule en société</InfoTerm> se prépare vers 70
              000 € de CA glissant.
            </p>
          </div>
          <div>
            <p className="font-semibold">EI / EURL</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Deviennent pertinentes avec de vraies charges déductibles (salarié, véhicule dédié,
              local) ou pour piloter rémunération et dividendes.
            </p>
          </div>
          <div>
            <p className="font-semibold">SASU</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Souplesse et régime assimilé salarié, mais 1 € net coûte 1,80 € — l'option la plus
              chère à revenu identique, et zéro droit retraite en tout-dividendes.
            </p>
          </div>
        </CardContent>
      </Card>
      <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
        Comparaison indicative à CA identique, alignée sur Simulation_Juridique_ProClean.xlsx :
        cotisations TNS ≈ 32 % du bénéfice (plancher 1 300 €), IS 15 % jusqu'à 42 500 € puis 25 %,
        flat tax 31,4 %, dividendes EURL &gt; 10 % du capital taxés 45 % + 12,8 %. À valider avec un
        expert-comptable.
      </p>
    </section>
  );
}
