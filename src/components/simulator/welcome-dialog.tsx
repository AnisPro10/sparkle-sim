import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  LayoutDashboard,
  Rocket,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "az-tour-done";

const STEPS = [
  {
    icon: Rocket,
    title: "1 · Démarrage",
    text: "Le chemin des formalités (préfecture → INPI → titre), le budget de 785 € et les critères de viabilité.",
  },
  {
    icon: SlidersHorizontal,
    title: "2 · Hypothèses",
    text: "Tarifs, régime micro, charges, capital. Chaque réglage recalcule tout le simulateur — les ⓘ expliquent chaque champ.",
  },
  {
    icon: CalendarDays,
    title: "3 · Plan d'activité",
    text: "Les volumes mois par mois. Les cases à cocher excluent une activité de tous les calculs.",
  },
  {
    icon: LayoutDashboard,
    title: "4 · Synthèse & analyses",
    text: "Le verdict, la trésorerie, les scénarios face au marché, l'analyse avancée et le rapport imprimable.",
  },
  {
    icon: BookOpenText,
    title: "À tout moment",
    text: "Les termes soulignés en pointillés affichent leur définition au survol ; le Dictionnaire les regroupe tous.",
  },
] as const;

// Visite guidée affichée à la première ouverture du simulateur, jamais ensuite.
export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) setOpen(true);
    } catch {
      /* navigation privée : pas de visite */
    }
  }, []);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            Bienvenue dans le simulateur L'AZ du Clean
          </DialogTitle>
          <DialogDescription>
            Le prévisionnel interactif du projet, en parité avec l'étude certifiée. Le parcours
            conseillé :
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">{s.title}</p>
                  <p className="text-xs leading-snug text-muted-foreground">{s.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={close}>
            Explorer librement
          </Button>
          <Button asChild size="sm" className="gap-1.5" onClick={close}>
            <Link to="/demarrage">
              Commencer par le démarrage
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
