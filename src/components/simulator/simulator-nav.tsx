import { useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Check, Download, FileSpreadsheet, Printer, Share2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { euro } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { ThemeToggle } from "./theme-toggle";
import { downloadExcel } from "./export-excel";

// Titre spécifique à chaque route — décrit le contenu de la page courante (H1 unique).
const PAGE_TITLES: Record<string, string> = {
  "/demarrage": "Démarrage & formalités",
  "/hypotheses": "Hypothèses",
  "/activite": "Plan d’activité",
  "/synthese": "Synthèse",
  "/compte-resultat": "Compte de résultat",
  "/tresorerie": "Trésorerie",
  "/scenarios": "Scénarios",
  "/projection": "Projection 5 ans",
  "/statuts": "Statuts juridiques",
  "/dictionnaire": "Dictionnaire",
};

function ShareBar() {
  const { hypotheses, result, loadAll, share } = useSimulator();
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadExcel(hypotheses, result);
      toast.success("Classeur Excel téléchargé");
    } catch {
      toast.error("Export Excel impossible");
    } finally {
      setExporting(false);
    }
  };

  const exportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(hypotheses, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulation-az-du-clean.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Simulation exportée en JSON");
    } catch {
      toast.error("Export JSON impossible");
    }
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data && typeof data === "object") {
          loadAll(data);
          toast.success("Simulation importée");
        } else {
          toast.error("Fichier JSON invalide");
        }
      } catch {
        toast.error("Fichier JSON invalide");
      }
    };
    reader.readAsText(file);
  };

  const onShare = async () => {
    const outcome = await share();
    if (outcome === "copied") {
      setCopied(true);
      toast.success("Lien de simulation copié");
      setTimeout(() => setCopied(false), 1800);
    } else if (outcome === "failed") {
      toast.error("Partage impossible — autorisez l’accès au presse-papiers");
    }
  };

  return (
    <div className="flex items-center gap-1.5 print:hidden">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={importJson}
        className="hidden"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={onShare}
        className="h-8 w-8"
        title="Copier le lien de la simulation"
        aria-label="Copier le lien de la simulation"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={exportJson}
        className="h-8 w-8"
        title="Exporter la simulation (JSON)"
        aria-label="Exporter la simulation en JSON"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => fileRef.current?.click()}
        className="h-8 w-8"
        title="Importer une simulation (JSON)"
        aria-label="Importer une simulation depuis un fichier JSON"
      >
        <Upload className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportXlsx}
        disabled={exporting}
        className="h-8 gap-1.5 text-xs"
        title="Exporter en Excel (.xlsx)"
        aria-label="Exporter en Excel"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{exporting ? "Export…" : "Excel"}</span>
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => window.print()}
        className="h-8 w-8"
        title="Imprimer ou enregistrer en PDF"
        aria-label="Imprimer ou enregistrer en PDF"
      >
        <Printer className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function SimulatorHeader() {
  const { hypotheses: h, result, activeScenario } = useSimulator();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const pageTitle = PAGE_TITLES[pathname] ?? "L’AZ du Clean";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 print:hidden">
      <div className="h-14 px-3 sm:px-5 flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 shrink-0" />
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <h1 className="font-display text-base font-semibold truncate min-w-0">
          <span className="text-muted-foreground hidden lg:inline">L’AZ du Clean — </span>
          {pageTitle}
        </h1>
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {activeScenario && (
            <Badge variant="outline" className="hidden lg:inline-flex max-w-40 truncate">
              {activeScenario}
            </Badge>
          )}
          <Badge variant="outline" className="hidden md:inline-flex">
            {h.acre ? "ACRE" : "Taux plein"} · {h.vfl ? "VFL" : "Barème"}
          </Badge>
          <Badge
            variant={result.realNet > 0 ? "success" : "destructive"}
            className="font-mono tabular-nums"
          >
            {euro(result.realNet)}
          </Badge>
          <Badge
            variant={result.fundable ? "success" : "destructive"}
            className="hidden md:inline-flex"
          >
            Tréso {result.fundable ? "OK" : "risque"}
          </Badge>
          <span className="hidden sm:block w-px h-5 bg-border mx-1" aria-hidden="true" />
          <ThemeToggle />
          <ShareBar />
        </div>
      </div>
    </header>
  );
}
