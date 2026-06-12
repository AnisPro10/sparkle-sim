import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CFE_YEAR2,
  euro,
  legalStatuses,
  percent,
  safePercent,
  type Hypotheses,
  type ModelResult,
} from "@/lib/simulator-model";
import { retirementQuarters } from "@/lib/advanced-analysis";
import { SectionHead } from "./results";
import { InfoTerm } from "./info-term";

type ColId = "micro" | "ei" | "eurl" | "sasu";
type Col = {
  id: ColId;
  title: string;
  sub: string;
  net: number;
  monthly: number;
};

// Critères qualitatifs par statut — les invariants juridiques 2026 de l'étude (phase 5).
const QUALI: Record<
  ColId,
  {
    cotisations: string;
    impot: (h: Hypotheses) => string;
    social: string;
    compta: string;
    plafond: string;
    dividendes: string;
    creation: string;
    quand: string;
  }
> = {
  micro: {
    cotisations: "21,2 % du CA encaissé (15,9 % avec ACRE) — pas de CA, pas de cotisations",
    impot: (h) =>
      h.vfl
        ? "Versement libératoire : 1,7 % du CA, payé au fil de l'eau"
        : `Barème sur 50 % du CA (abattement micro-BIC), TMI ${percent(h.tmi)}`,
    social: "Couverture indépendant ; ≈ 13 000 € de CA valident 4 trimestres de retraite",
    compta: "Livre des recettes + déclarations URSSAF — gérable seul, sans comptable",
    plafond: "83 600 € de CA services ; franchise TVA jusqu'à 37 500 €",
    dividendes: "Sans objet — tout le net est disponible immédiatement",
    creation: "Gratuite (guichet INPI), opérationnelle en quelques jours",
    quand: "Le départ idéal : charges réelles faibles, zéro structure, bascule possible plus tard",
  },
  ei: {
    cotisations: "≈ 32 % du bénéfice (plancher 1 300 €/an même sans revenu)",
    impot: () => "Barème de l'IR sur le bénéfice après cotisations",
    social: "Couverture indépendant, cotisations proportionnelles au bénéfice réel",
    compta: "Comptabilité d'engagement complète — expert-comptable recommandé (~1 200 €/an)",
    plafond: "Aucun plafond de CA ; TVA dès le 1er euro au réel normal",
    dividendes: "Sans objet — le bénéfice est le revenu",
    creation: "Gratuite (guichet INPI), régime réel à déclarer",
    quand: "Quand les charges réelles dépassent l'abattement de 50 % du régime micro",
  },
  eurl: {
    cotisations: "Gérant TNS : 1 € net coûte ≈ 1,45 € (cotisation min. 1 300 € si non rémunéré)",
    impot: () => "IS 15 % jusqu'à 42 500 € puis 25 % ; dividendes > 10 % du capital taxés ≈ 58 %",
    social: "TNS : couverture correcte, retraite selon la rémunération choisie",
    compta: "Comptabilité de société + dépôt des comptes — expert-comptable indispensable",
    plafond: "Aucun plafond ; TVA au réel ; permet de déduire toutes les charges",
    dividendes: "Possibles mais lourdement taxés au-delà de 10 % du capital social",
    creation: "≈ 300-600 € (statuts, annonce légale, dépôt de capital), 2-4 semaines",
    quand: "La bascule naturelle vers 70 000 € de CA, ou dès l'embauche d'un salarié",
  },
  sasu: {
    cotisations: "Président assimilé salarié : 1 € net coûte ≈ 1,80 € — la plus chère",
    impot: () => "IS 15 %/25 % puis flat tax 31,4 % sur les dividendes",
    social: "Régime général (comme un salarié) — mais zéro droit retraite en tout-dividendes",
    compta: "Comptabilité de société + fiches de paie — coût de gestion le plus élevé",
    plafond: "Aucun plafond ; TVA au réel ; image « société » auprès des grands comptes",
    dividendes: "Flat tax 31,4 % uniforme, sans cotisations sociales dessus",
    creation: "≈ 300-600 € (statuts, annonce légale), 2-4 semaines",
    quand:
      "Pour lever des fonds, s'associer ou protéger un autre statut social — rarement au démarrage",
  },
};

export function StatusesView({ h, m }: { h: Hypotheses; m: ModelResult }) {
  const all = legalStatuses(h, m.revenue);
  const find = (id: string) => all.find((s) => s.id === id);
  // La colonne Micro reflète les réglages courants (ACRE cochée → variante ACRE, sinon VFL/barème)
  const microVariant = find(h.acre ? "micro-acre" : h.vfl ? "micro-vfl" : "micro-bareme") ?? all[0];
  const cols: Col[] = [
    {
      id: "micro",
      title: "Micro-entreprise",
      sub: microVariant.name.replace("Micro + ", "").replace("Micro au ", ""),
      net: microVariant.value,
      monthly: microVariant.monthly,
    },
    {
      id: "ei",
      title: "EI au réel",
      sub: "entreprise individuelle",
      net: find("ei")?.value ?? 0,
      monthly: find("ei")?.monthly ?? 0,
    },
    {
      id: "eurl",
      title: "EURL",
      sub: find("eurl")?.name.replace("EURL — ", "") ?? "",
      net: find("eurl")?.value ?? 0,
      monthly: find("eurl")?.monthly ?? 0,
    },
    {
      id: "sasu",
      title: "SASU",
      sub: "tout dividendes",
      net: find("sasu")?.value ?? 0,
      monthly: find("sasu")?.monthly ?? 0,
    },
  ];
  const bestNet = Math.max(...cols.map((c) => c.net));

  type RowDef = {
    label: string;
    term?: string;
    get: (c: Col) => React.ReactNode;
    strong?: boolean;
  };
  const rows: RowDef[] = [
    {
      label: "Net en poche / an",
      term: "Net réel",
      strong: true,
      get: (c) => (
        <span
          className={cn(
            "font-mono font-bold tabular-nums",
            c.net === bestNet ? "text-success" : "text-foreground",
          )}
        >
          {euro(Math.round(c.net))}
        </span>
      ),
    },
    {
      label: "Net mensuel",
      get: (c) => <span className="font-mono tabular-nums">{euro(c.monthly)}</span>,
    },
    {
      label: "Part du CA conservée",
      get: (c) => <span className="font-mono tabular-nums">{safePercent(c.net, m.revenue)}</span>,
    },
    {
      label: "Écart vs meilleur statut",
      get: (c) =>
        c.net === bestNet ? (
          <Badge variant="success">Meilleur net</Badge>
        ) : (
          <span className="font-mono tabular-nums text-destructive">
            −{euro(Math.round(bestNet - c.net))}
          </span>
        ),
    },
    {
      label: "Cotisations sociales",
      term: "Micro-entreprise",
      get: (c) => QUALI[c.id].cotisations,
    },
    {
      label: "Impôt",
      term: "Versement fiscal libératoire (VFL)",
      get: (c) => QUALI[c.id].impot(h),
    },
    {
      label: "Trimestres de retraite validés (an 1)",
      get: (c) =>
        c.id === "micro" ? (
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {retirementQuarters(m.revenue)} / 4
            <span className="ml-1 font-sans text-[10px] font-normal text-muted-foreground">
              (CA {euro(m.revenue)})
            </span>
          </span>
        ) : (
          "selon la rémunération versée"
        ),
    },
    { label: "Protection sociale & retraite", get: (c) => QUALI[c.id].social },
    { label: "Comptabilité & gestion", get: (c) => QUALI[c.id].compta },
    { label: "Plafonds & TVA", term: "Plafond micro", get: (c) => QUALI[c.id].plafond },
    { label: "Dividendes", get: (c) => QUALI[c.id].dividendes },
    { label: "Création (coût · délai)", get: (c) => QUALI[c.id].creation },
    {
      label: "Quand le choisir",
      strong: true,
      get: (c) => <span className="text-foreground/90">{QUALI[c.id].quand}</span>,
    },
  ];

  return (
    <section>
      <SectionHead
        title="Quel statut juridique ?"
        desc={`Net en poche annuel pour ${euro(m.revenue)} de CA — formules vérifiées cellule par cellule contre le comparateur juridique (audit du 12/06/2026).`}
      />

      <Card>
        <CardContent className="p-5">
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <caption className="sr-only">
                Comparaison des statuts juridiques : critères chiffrés et qualitatifs
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-44 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider py-2 pr-3 align-bottom"
                  >
                    Critère
                  </th>
                  {cols.map((c) => (
                    <th
                      key={c.id}
                      scope="col"
                      className={cn(
                        "text-left py-2.5 px-3 align-bottom",
                        c.net === bestNet && "bg-success/5 rounded-t-md",
                      )}
                    >
                      <span className="block font-display text-base font-semibold">{c.title}</span>
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {c.sub}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-border/60 align-top">
                    <th
                      scope="row"
                      className={cn(
                        "text-left py-2.5 pr-3 font-normal leading-snug",
                        r.strong ? "text-foreground font-semibold" : "text-muted-foreground",
                      )}
                    >
                      {r.term ? <InfoTerm term={r.term}>{r.label}</InfoTerm> : r.label}
                    </th>
                    {cols.map((c) => (
                      <td
                        key={c.id}
                        className={cn(
                          "py-2.5 px-3 text-xs leading-relaxed text-muted-foreground",
                          c.net === bestNet && "bg-success/5",
                          r.strong && "text-sm",
                        )}
                      >
                        {r.get(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
            Convention du comparateur certifié : la micro est simulée sur l'année de création (sans{" "}
            <InfoTerm term="CFE">CFE</InfoTerm>) ; EI, EURL et SASU en année type avec CFE de{" "}
            {euro(CFE_YEAR2)}. La colonne Micro suit vos réglages (ACRE{" "}
            {h.acre ? "activée" : "non activée"}, {h.vfl ? "versement libératoire" : "barème"}).
          </p>
        </CardContent>
      </Card>

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
