import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { computeModel, hypothesesSchema, OFFICIAL, type Hypotheses } from "@/lib/simulator-model";

type SavedScenario = { name: string; hypotheses: Hypotheses };
type SimulatorContextValue = {
  hypotheses: Hypotheses; result: ReturnType<typeof computeModel>; saved: SavedScenario[];
  setField: <K extends keyof Hypotheses>(key: K, value: Hypotheses[K]) => void;
  setMonthValue: (key: "sites" | "seasonality" | "glassJobs" | "airbnb" | "privateJobs", index: number, value: number) => void;
  applyPreset: (preset: Hypotheses) => void; saveScenario: (name: string) => void; loadScenario: (scenario: SavedScenario) => void; deleteScenario: (name: string) => void;
  share: () => Promise<boolean>; exportCsv: () => void;
};

const SimulatorContext = createContext<SimulatorContextValue | null>(null);
const STORAGE_KEY = "az-clean-simulator-v1";
const SAVED_KEY = "az-clean-scenarios-v1";

function encode(value: unknown) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
function decode(value: string) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }
function readInitial() {
  if (typeof window === "undefined") return OFFICIAL;
  try {
    const hash = new URLSearchParams(window.location.hash.slice(1)).get("s");
    return hypothesesSchema.parse(hash ? decode(hash) : JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? OFFICIAL);
  } catch { return OFFICIAL; }
}

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [hypotheses, setHypotheses] = useState<Hypotheses>(readInitial);
  const [saved, setSaved] = useState<SavedScenario[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
  });
  const result = useMemo(() => computeModel(hypotheses), [hypotheses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(hypotheses)); }, [hypotheses]);
  useEffect(() => { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); }, [saved]);
  const setField = useCallback(<K extends keyof Hypotheses>(key: K, value: Hypotheses[K]) => setHypotheses((old) => ({ ...old, [key]: value })), []);
  const setMonthValue = useCallback((key: "sites" | "seasonality" | "glassJobs" | "airbnb" | "privateJobs", index: number, value: number) => setHypotheses((old) => ({ ...old, [key]: old[key].map((item, i) => i === index ? value : item) })), []);
  const saveScenario = (name: string) => { const clean = name.trim(); if (clean) setSaved((old) => [...old.filter((item) => item.name !== clean), { name: clean, hypotheses }]); };
  const share = async () => { const url = `${window.location.origin}${window.location.pathname}#s=${encode(hypotheses)}`; history.replaceState(null, "", url); try { await navigator.clipboard.writeText(url); return true; } catch { return false; } };
  const exportCsv = () => {
    const header = "Mois;B2B;Vitrerie;Airbnb;Particuliers;CA;Net;Heures;Trésorerie";
    const rows = result.months.map((m) => [m.month,m.b2b,m.glass,m.airbnb,m.private,m.ca,m.net,m.hours,m.cash].map((v) => typeof v === "number" ? v.toFixed(2).replace(".",",") : v).join(";"));
    const blob = new Blob(["\ufeff" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "simulation-az-du-clean.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  return <SimulatorContext.Provider value={{ hypotheses, result, saved, setField, setMonthValue, applyPreset: setHypotheses, saveScenario, loadScenario: (s) => setHypotheses(s.hypotheses), deleteScenario: (name) => setSaved((old) => old.filter((s) => s.name !== name)), share, exportCsv }}>{children}</SimulatorContext.Provider>;
}

export function useSimulator() { const value = useContext(SimulatorContext); if (!value) throw new Error("useSimulator doit être utilisé dans SimulatorProvider"); return value; }