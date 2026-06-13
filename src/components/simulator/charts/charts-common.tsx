/* eslint-disable react-refresh/only-export-components -- module de primitives partagées : un petit composant (ChartTip) et ses helpers cohabitent volontairement */
import { cn } from "@/lib/utils";
import { euro, type ModelResult } from "@/lib/simulator-model";

// recharts (~115 kB gzip) vit dans ce dossier à part : chargé en lazy uniquement
// par les pages qui en ont besoin (/synthese, /tresorerie, /scenarios…).

export const AXIS = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

// Libellé du préréglage actif — le libellé du cas personnalisé varie selon la vue.
export function presetLabel(preset: string | null, custom: string) {
  return preset === "officiel"
    ? "préréglage officiel"
    : preset === "realiste"
      ? "réaliste terrain"
      : custom;
}

// Agrégats annuels des charges par nature (cotisations, impôt + CFP, variables).
export function chargesAggregates(m: ModelResult) {
  return {
    cotis: m.byActivity.reduce((s, a) => s + a.cotisations, 0),
    impots: m.byActivity.reduce((s, a) => s + a.impot + a.cfp, 0),
    variables: m.byActivity.reduce((s, a) => s + a.produits + a.deplacements, 0),
  };
}

export function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md min-w-[160px]">
      {label && (
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
          {label}
        </div>
      )}
      {payload.map((p, i) => {
        const n = Number(p.value);
        if (!Number.isFinite(n)) return null;
        return (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
              {p.name}
            </span>
            <span
              className={cn(
                "font-mono tabular-nums font-semibold",
                n >= 0 ? "text-foreground" : "text-destructive",
              )}
            >
              {euro(n)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
