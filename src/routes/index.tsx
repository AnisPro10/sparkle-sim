import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  FileSpreadsheet,
  Landmark,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { euro } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulateur financier — L'AZ du Clean" },
      {
        name: "description",
        content:
          "Simulez la viabilité, la trésorerie et le statut juridique de L'AZ du Clean — nettoyage professionnel B2B en Seine-Saint-Denis & Paris. Parité avec le prévisionnel certifié.",
      },
      { property: "og:title", content: "Simulateur financier — L'AZ du Clean" },
      {
        property: "og:description",
        content: "Prévisionnel interactif de l'activité de nettoyage B2B L'AZ du Clean.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: BarChart3,
    title: "Prévisionnel vivant",
    text: "Chaque hypothèse recalcule instantanément les dix vues : synthèse, compte de résultat par activité, trésorerie à 30 jours, scénarios.",
  },
  {
    icon: Landmark,
    title: "Juridique chiffré",
    text: "Micro (VFL, ACRE, barème), EI, EURL, SASU comparés à CA identique — les formules du comparateur juridique certifié.",
  },
  {
    icon: LineChart,
    title: "Projection 5 ans",
    text: "Croissance paramétrable, fin de l'ACRE, CFE, seuil de TVA et plafond micro tracés année par année.",
  },
  {
    icon: FileSpreadsheet,
    title: "Exports professionnels",
    text: "Classeur Excel mis en forme (7 feuilles), export et import JSON, impression PDF propre, lien de partage.",
  },
] as const;

function LandingPage() {
  const { result } = useSimulator();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Fond : halo de marque */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-90"
        aria-hidden="true"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div className="relative mx-auto max-w-5xl px-5 pb-16">
        {/* Header minimal */}
        <header className="flex items-center justify-between py-6 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white font-display text-base font-black text-[#1F3864] shadow">
              AZ
            </span>
            <div className="leading-tight">
              <p className="font-display text-base font-bold">L'AZ du Clean</p>
              <p className="text-[11px] italic text-white/75">La propreté qui tient parole.</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link to="/synthese">
              Ouvrir le simulateur
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </header>

        {/* Hero */}
        <section className="pt-10 pb-12 text-center text-white">
          <p className="mx-auto flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <Sparkles className="h-3 w-3" />
            Simulateur de viabilité · 2026
          </p>
          <h1 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl">
            Le prévisionnel interactif du projet de nettoyage professionnel
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80">
            Bureaux, commerces et cabinets en Seine-Saint-Denis & Paris. Un moteur en parité stricte
            avec le prévisionnel Excel certifié : mêmes formules, mêmes arrondis, mêmes chiffres.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/demarrage">
                Commencer par le démarrage
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/hypotheses">Régler les hypothèses</Link>
            </Button>
          </div>
        </section>

        {/* Bandeau de chiffres (vivants : suivent la simulation) */}
        <section
          className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-lg sm:grid-cols-4"
          aria-label="Chiffres clés de la simulation courante"
        >
          {[
            { label: "CA année 1", value: euro(result.revenue) },
            { label: "Net réel année 1", value: euro(result.realNet) },
            { label: "Net de croisière", value: `${euro(result.cruiseNet)}/mois` },
            { label: "Point bas trésorerie", value: euro(result.lowCash) },
          ].map((k) => (
            <div key={k.label} className="text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {k.label}
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                {k.value}
              </p>
            </div>
          ))}
        </section>

        {/* Fonctionnalités */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardContent className="p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 font-display text-base font-semibold">{f.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Bandeau confiance */}
        <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Moteur vérifié par 27 tests de parité contre les classeurs certifiés (audit du
              12/06/2026).
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/synthese">
              <CalendarCheck className="h-3.5 w-3.5" />
              Voir le tableau de bord
            </Link>
          </Button>
        </section>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          L'AZ du Clean — prévisionnel indicatif 2026 · Seine-Saint-Denis & Paris
        </footer>
      </div>
    </div>
  );
}
