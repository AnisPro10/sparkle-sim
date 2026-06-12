import { Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { activePresetId, euro, percent, PRESETS } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";

// Rappel compact des hypothèses courantes, affiché sur toutes les pages sauf /hypotheses.
export function HypothesesRecap() {
  const { hypotheses: h, result } = useSimulator();
  const preset = activePresetId(h);
  const presetLabel = preset
    ? (PRESETS.find((p) => p.id === preset)?.name ?? "Officiel")
    : "Personnalisé";
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5 print:hidden">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Hypothèses :</span>
        <Badge variant="secondary">{presetLabel}</Badge>
        <Badge variant="secondary">{h.hourlyB2B} €/h B2B</Badge>
        <Badge variant="secondary">{h.sites[11]} sites fin d’année</Badge>
        <Badge variant="secondary">{h.acre ? `ACRE ${percent(h.acreRate)}` : "sans ACRE"}</Badge>
        <Badge variant="secondary">{h.vfl ? "VFL" : "barème"}</Badge>
        <Badge variant="secondary">Apport {euro(h.contribution)}</Badge>
        <Badge variant="secondary">Objectif {euro(h.target)}/mois</Badge>
        {(() => {
          const off = [
            [!h.enabledB2b, "B2B"],
            [!h.enabledGlass, "vitrerie"],
            [!h.enabledAirbnb, "Airbnb"],
            [!h.enabledPrivate, "particuliers"],
          ]
            .filter(([excluded]) => excluded)
            .map(([, name]) => name);
          return off.length > 0 ? <Badge variant="warning">sans {off.join(" ni ")}</Badge> : null;
        })()}
        {(h.churnRate > 0 ||
          h.inflationPrices > 0 ||
          h.inflationCosts > 0 ||
          (h.progressiveTax && !h.vfl)) && (
          <Badge
            variant="warning"
            title="Options de réalisme actives — chiffres hors périmètre du prévisionnel Excel certifié"
          >
            mode avancé
          </Badge>
        )}
        <Badge variant={result.fundable ? "success" : "destructive"}>
          Point bas {euro(result.lowCash)}
        </Badge>
      </div>
      <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
        <Link to="/hypotheses">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Modifier
        </Link>
      </Button>
    </div>
  );
}
