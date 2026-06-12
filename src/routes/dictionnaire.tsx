import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, TERMES } from "@/components/simulator/glossaire";

export const Route = createFileRoute("/dictionnaire")({
  head: () => ({
    meta: [
      { title: "Dictionnaire — Simulateur L'AZ du Clean" },
      {
        name: "description",
        content:
          "Tous les termes du simulateur (finance, fiscalité micro, juridique, aides, métier propreté) expliqués simplement, avec exemples chiffrés.",
      },
      { property: "og:title", content: "Dictionnaire — Simulateur L'AZ du Clean" },
      {
        property: "og:description",
        content: "Glossaire simple : net de gestion, ACRE, VFL, BFR, point bas, QPV…",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: "Dictionnaire du simulateur L'AZ du Clean",
          description:
            "Glossaire des termes financiers, fiscaux, juridiques et métier du simulateur de nettoyage professionnel.",
          inLanguage: "fr-FR",
          hasDefinedTerm: TERMES.map((t) => ({
            "@type": "DefinedTerm",
            name: t.mot,
            description: t.def,
          })),
        }),
      },
    ],
  }),
  component: DictionnairePage,
});

function DictionnairePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Tous");

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TERMES.filter(
      (t) =>
        (cat === "Tous" || t.cat === cat) &&
        (!needle || t.mot.toLowerCase().includes(needle) || t.def.toLowerCase().includes(needle)),
    );
  }, [q, cat]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Dictionnaire</h2>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Tous les termes techniques du simulateur, expliqués comme à quelqu'un de non financier —
          le même esprit que l'onglet Dictionnaire du prévisionnel Excel. Les termes soulignés en
          pointillés dans le simulateur affichent leur définition au survol.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher un terme (ex. ACRE, point bas…)"
            aria-label="Chercher un terme du dictionnaire"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Filtrer par catégorie"
          className="flex flex-wrap gap-1.5"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cat === c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                cat === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aucun terme ne correspond à « {q} ».
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map((t) => (
            <Card key={t.mot}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold leading-snug">{t.mot}</h3>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {t.cat}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.def}</p>
                {t.exemple && (
                  <p className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs leading-relaxed text-foreground/80">
                    <span className="font-semibold text-primary">Exemple : </span>
                    {t.exemple}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
