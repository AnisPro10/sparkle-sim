import { useState } from "react";
import { FolderOpen, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { euro } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";

// Plusieurs simulations nommées côte à côte : enregistrer / charger / supprimer.
export function ScenarioManager() {
  const {
    hypotheses: h,
    saved,
    activeScenario,
    saveScenario,
    loadScenario,
    deleteScenario,
  } = useSimulator();
  const [name, setName] = useState("");

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <FolderOpen className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold">Mes scénarios</h3>
            <p className="text-[11px] text-muted-foreground">
              Sauvegardez plusieurs simulations et rechargez-les d'un clic.
            </p>
          </div>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const suggestion = name.trim() || `${h.sites[11]} sites · ${euro(h.target)}/mois`;
            if (saveScenario(suggestion)) {
              toast.success(`Scénario « ${suggestion} » enregistré`);
              setName("");
            }
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Ex. ${h.sites[11]} sites · objectif ${euro(h.target)}`}
            aria-label="Nom du scénario à enregistrer"
            maxLength={80}
            className="h-9"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs shrink-0"
          >
            <Save className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        </form>

        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground pt-3">
            Aucun scénario enregistré pour l'instant.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {saved.map((sc) => (
              <li key={sc.name} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => {
                    loadScenario(sc);
                    toast.success(`Scénario « ${sc.name} » chargé`);
                  }}
                  className="flex-1 min-w-0 text-left rounded-md px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-2 truncate text-sm font-medium">
                    {sc.name}
                    {activeScenario === sc.name && (
                      <Badge variant="success" className="text-[9px] px-1.5 py-0">
                        actif
                      </Badge>
                    )}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {sc.hypotheses.sites[11]} sites fin d'année · apport{" "}
                    {euro(sc.hypotheses.contribution)} ·{" "}
                    {sc.hypotheses.acre ? "ACRE" : "taux plein"}
                  </span>
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Supprimer ${sc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer « {sc.name} » ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le scénario sera définitivement retiré de cet appareil.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteScenario(sc.name);
                          toast.success(`Scénario « ${sc.name} » supprimé`);
                        }}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
