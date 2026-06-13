import { useEffect, useId, useState } from "react";
import { Minus, Plus, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Primitives de formulaire partagées par le panneau d'hypothèses, l'analyse avancée
// et le pilotage — extraites pour que ces pages ne tirent pas tout le panneau.

// Icône ⓘ : explique à quoi sert le champ dans la simulation (survol ou focus clavier).
export function InfoDot({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          aria-label="À quoi sert ce champ ?"
          className="inline-grid h-4 w-4 place-items-center rounded-full text-muted-foreground/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring align-middle"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-popover text-popover-foreground border border-border shadow-md">
        <span className="block text-xs leading-relaxed text-muted-foreground">{text}</span>
      </TooltipContent>
    </Tooltip>
  );
}

// Champ numérique professionnel : saisie au clavier + pas à pas (−/+), unité, bornes,
// et infobulle ⓘ expliquant le rôle du champ dans la simulation.
export function NumberField({
  label,
  value,
  set,
  min,
  max,
  step,
  unit,
  hint,
  info,
}: {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
  info?: string;
}) {
  const id = useId();
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // Resynchronise depuis le modèle (reset, préréglage) seulement hors saisie active.
  useEffect(() => {
    if (!focused) setRaw(String(value));
  }, [value, focused]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const parse = (str: string) => parseFloat(str.replace(",", "."));
  const onChange = (str: string) => {
    setRaw(str);
    const n = parse(str);
    if (!Number.isNaN(n)) set(clamp(n));
  };
  const nudge = (dir: number) => {
    const base = clamp(Number.isNaN(parse(raw)) ? value : parse(raw));
    // Arrondi du bruit flottant AVANT le clamp : clamp(x × 10000) écraserait la
    // valeur par max/10000 (ex. 30 €/h → 0,02 €/h) sur tout champ à borne finie.
    const stepped = Math.round((base + dir * step) / step) * step;
    const n = clamp(Math.round(stepped * 10000) / 10000);
    set(n);
    setRaw(String(n));
  };

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-foreground/80"
      >
        {label}
        {info && <InfoDot text={info} />}
      </label>
      <div className="flex items-stretch h-9 rounded-md border border-input bg-background overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-ring">
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Diminuer ${label}`}
          onClick={() => nudge(-1)}
          className="px-2 grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={raw}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setRaw(String(value));
          }}
          className="min-w-0 flex-1 bg-transparent px-1 text-center text-sm font-mono font-semibold tabular-nums text-foreground outline-none border-x border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && (
          <span className="px-2 grid place-items-center text-[11px] text-muted-foreground whitespace-nowrap select-none">
            {unit}
          </span>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Augmenter ${label}`}
          onClick={() => nudge(1)}
          className="px-2 grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-input"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}
