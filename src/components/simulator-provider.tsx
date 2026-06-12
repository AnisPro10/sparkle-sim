import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import { clampHypotheses, computeModel, OFFICIAL, type Hypotheses } from "@/lib/simulator-model";

type SavedScenario = { name: string; hypotheses: Hypotheses };
type SimulatorContextValue = {
  hypotheses: Hypotheses;
  result: ReturnType<typeof computeModel>;
  saved: SavedScenario[];
  activeScenario: string | null;
  setField: <K extends keyof Hypotheses>(key: K, value: Hypotheses[K]) => void;
  setMonthValue: (
    key: "sites" | "seasonality" | "glassJobs" | "airbnb" | "privateJobs",
    index: number,
    value: number,
  ) => void;
  applyPreset: (preset: Hypotheses) => void;
  /** Remplace tout l'état (import JSON, scénario) — l'entrée est clampée, jamais de crash. */
  loadAll: (data: unknown) => void;
  saveScenario: (name: string) => boolean;
  loadScenario: (scenario: SavedScenario) => void;
  deleteScenario: (name: string) => void;
  share: () => Promise<"copied" | "shared" | "failed">;
  exportCsv: () => void;
};

const SimulatorContext = createContext<SimulatorContextValue | null>(null);
const STORAGE_KEY = "az-clean-simulator-v1";
const SAVED_KEY = "az-clean-scenarios-v1";

// Un scénario chargé depuis localStorage peut être périmé (schéma qui a évolué),
// corrompu ou forgé : on le repasse toujours par clampHypotheses, qui ne jette jamais.
const savedItemSchema = z.object({ name: z.string().trim().min(1), hypotheses: z.unknown() });
const SCENARIO_NAME_MAX = 80;

function encode(value: unknown) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}
function decode(value: string) {
  return JSON.parse(decodeURIComponent(escape(atob(value))));
}

function readClientState(): { hypotheses: Hypotheses | null; fromHash: boolean } {
  try {
    const hash = new URLSearchParams(window.location.hash.slice(1)).get("s");
    if (hash) return { hypotheses: clampHypotheses(decode(hash)), fromHash: true };
  } catch {
    /* hash illisible : on l'ignore */
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { hypotheses: clampHypotheses(JSON.parse(stored)), fromHash: false };
  } catch {
    /* localStorage indisponible ou corrompu */
  }
  return { hypotheses: null, fromHash: false };
}

function readSavedScenarios(): SavedScenario[] {
  // Tolérant entrée par entrée : une seule entrée corrompue ne détruit pas les autres.
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    const out: SavedScenario[] = [];
    for (const item of raw) {
      const parsed = savedItemSchema.safeParse(item);
      if (parsed.success) {
        out.push({
          name: parsed.data.name.slice(0, SCENARIO_NAME_MAX),
          hypotheses: clampHypotheses(parsed.data.hypotheses),
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function SimulatorProvider({ children }: { children: ReactNode }) {
  // SSR et premier rendu client identiques (OFFICIAL) ; l'état réel (URL/localStorage)
  // est chargé après montage pour éviter tout mismatch d'hydratation.
  const [hypotheses, setHypotheses] = useState<Hypotheses>(OFFICIAL);
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  // En state (pas en ref) : les effets de persistance du montage initial s'exécutent
  // AVANT que le chargement n'ait rendu — une ref serait déjà à true et ils écraseraient
  // localStorage avec les valeurs par défaut.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const { hypotheses: initial, fromHash } = readClientState();
    if (initial) setHypotheses(initial);
    if (fromHash) {
      // Le hash est consommé une seule fois puis retiré : sinon chaque rechargement
      // ré-appliquerait silencieusement l'état partagé et écraserait le travail en cours.
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setSaved(readSavedScenarios());
    setHydrated(true);
  }, []);

  const result = useMemo(() => computeModel(hypotheses), [hypotheses]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hypotheses));
    } catch {
      /* navigation privée / quota plein : tant pis pour la persistance */
    }
  }, [hypotheses, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [saved, hydrated]);

  const setField = useCallback(<K extends keyof Hypotheses>(key: K, value: Hypotheses[K]) => {
    setActiveScenario(null);
    setHypotheses((old) => ({ ...old, [key]: value }));
  }, []);

  const setMonthValue = useCallback(
    (
      key: "sites" | "seasonality" | "glassJobs" | "airbnb" | "privateJobs",
      index: number,
      value: number,
    ) => {
      setActiveScenario(null);
      setHypotheses((old) => ({
        ...old,
        [key]: old[key].map((item, i) => (i === index ? value : item)),
      }));
    },
    [],
  );

  const applyPreset = useCallback((preset: Hypotheses) => {
    setActiveScenario(null);
    setHypotheses(preset);
  }, []);

  const loadAll = useCallback((data: unknown) => {
    setActiveScenario(null);
    setHypotheses(clampHypotheses(data));
  }, []);

  const saveScenario = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, SCENARIO_NAME_MAX);
      if (!clean) return false;
      setSaved((old) => [
        ...old.filter((item) => item.name !== clean),
        { name: clean, hypotheses },
      ]);
      setActiveScenario(clean);
      return true;
    },
    [hypotheses],
  );

  const loadScenario = useCallback((scenario: SavedScenario) => {
    setHypotheses(clampHypotheses(scenario.hypotheses));
    setActiveScenario(scenario.name);
  }, []);

  const deleteScenario = useCallback((name: string) => {
    setSaved((old) => old.filter((s) => s.name !== name));
    setActiveScenario((current) => (current === name ? null : current));
  }, []);

  // Construit l'URL de partage (avec la page courante) et la copie SANS modifier
  // l'URL du document ; repli sur le partage natif si le presse-papiers est refusé.
  const share = useCallback(async (): Promise<"copied" | "shared" | "failed"> => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#s=${encode(hypotheses)}`;
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      try {
        if (navigator.share) {
          await navigator.share({ url });
          return "shared";
        }
      } catch {
        /* partage natif refusé ou annulé */
      }
      return "failed";
    }
  }, [hypotheses]);

  const exportCsv = useCallback(() => {
    const fmt = (v: number) => v.toFixed(2).replace(".", ",");
    const lines = [
      "Simulation L'AZ du Clean — export du prévisionnel",
      "",
      "Mois;B2B;Vitrerie;Airbnb;Particuliers;CA;Heures;Net de gestion;Encaissements;Trésorerie",
      ...result.months.map((m) =>
        [
          m.month,
          fmt(m.b2b),
          fmt(m.glass),
          fmt(m.airbnb),
          fmt(m.private),
          fmt(m.ca),
          String(m.hours),
          fmt(m.netGestion),
          fmt(m.receipts),
          fmt(m.cash),
        ].join(";"),
      ),
      "",
      "Indicateur;Valeur",
      `CA année 1;${fmt(result.revenue)}`,
      `Net réel année 1;${fmt(result.realNet)}`,
      `Net de croisière;${fmt(result.cruiseNet)}`,
      `Point bas trésorerie;${fmt(result.lowCash)}`,
      `Apport minimal;${fmt(result.minimumContribution)}`,
      `Apport recommandé;${fmt(result.recommendedContribution)}`,
      "",
      "Scénario;CA;Net",
      ...result.scenarios.map((s) => `${s.name};${fmt(s.ca)};${fmt(s.net)}`),
      "",
      "Projection;CA;Net",
      ...result.projection.map((p) => `${p.year};${fmt(p.revenue)};${fmt(p.net)}`),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = "simulation-az-du-clean.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Révocation différée : un revoke synchrone peut avorter le téléchargement (Firefox/Safari).
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }, [result]);

  const value = useMemo(
    () => ({
      hypotheses,
      result,
      saved,
      activeScenario,
      setField,
      setMonthValue,
      applyPreset,
      loadAll,
      saveScenario,
      loadScenario,
      deleteScenario,
      share,
      exportCsv,
    }),
    [
      hypotheses,
      result,
      saved,
      activeScenario,
      setField,
      setMonthValue,
      applyPreset,
      loadAll,
      saveScenario,
      loadScenario,
      deleteScenario,
      share,
      exportCsv,
    ],
  );

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

export function useSimulator() {
  const value = useContext(SimulatorContext);
  if (!value) throw new Error("useSimulator doit être utilisé dans SimulatorProvider");
  return value;
}
