import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getTerme } from "./glossaire";

// Libellé relié au glossaire : souligné en pointillés, définition au survol/focus.
// term = le mot exact du glossaire ; children = le texte affiché (par défaut le mot).
export function InfoTerm({ term, children }: { term: string; children?: React.ReactNode }) {
  const t = getTerme(term);
  if (!t) return <>{children ?? term}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {children ?? term}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-popover text-popover-foreground border border-border shadow-md">
        <span className="font-display text-xs font-semibold text-foreground">{t.mot}</span>
        <span className="block mt-1 text-xs leading-relaxed text-muted-foreground">{t.def}</span>
      </TooltipContent>
    </Tooltip>
  );
}
