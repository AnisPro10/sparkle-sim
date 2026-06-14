import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  Building2,
  Camera,
  FileCheck2,
  FlaskConical,
  Home,
  LayoutDashboard,
  LineChart,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { euro, safePercent } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { BrandLockup, BrandMark } from "@/components/brand/logo";

const SITE_URL = "https://l-az-du-cleann.lovable.app";
const OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f4219723-20b8-4d4e-8b34-188d78a2ac40";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "L'AZ du Clean — La propreté qui tient parole" },
      {
        name: "description",
        content:
          "Nettoyage B2B en Seine-Saint-Denis & Paris : bureaux, commerces, vitrerie, Airbnb. Devis 48 h, preuve photo, rattrapage garanti. Simulateur financier inclus.",
      },
      { property: "og:title", content: "L'AZ du Clean — La propreté qui tient parole" },
      {
        property: "og:description",
        content: "Nettoyage professionnel B2B & simulateur financier certifié.",
      },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "L'AZ du Clean",
          description:
            "Nettoyage professionnel B2B : bureaux, commerces, cabinets, vitrerie et rotations Airbnb.",
          url: SITE_URL,
          logo: SITE_URL + "/logo.svg",
          image: OG_IMAGE,
          areaServed: [
            { "@type": "AdministrativeArea", name: "Seine-Saint-Denis" },
            { "@type": "AdministrativeArea", name: "Paris" },
          ],
          slogan: "La propreté qui tient parole.",
        }),
      },
    ],
  }),
  component: LandingPage,
});

/* Compteur animé (easing cubique, respecte prefers-reduced-motion, SSR-safe : part de 0). */
function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function Kpi({
  label,
  value,
  suffix,
  delay,
}: {
  label: string;
  value: number;
  suffix?: string;
  delay: number;
}) {
  const v = useCountUp(value);
  return (
    <div className="az-reveal text-center" style={{ animationDelay: `${delay}ms` }}>
      <p className="font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
        {euro(v)}
        {suffix && <span className="text-sm font-medium text-muted-foreground"> {suffix}</span>}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

/* Étincelle décorative de marque */
function Spark({
  className,
  size = 22,
  delay = 0,
}: {
  className?: string;
  size?: number;
  delay?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("az-float absolute text-[#d9a400]", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      <path
        fill="currentColor"
        d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z"
      />
    </svg>
  );
}

const ENGAGEMENTS = [
  {
    icon: FileCheck2,
    title: "Devis sous 48 h",
    text: "Visite, métrage et proposition écrite en deux jours ouvrés — pas de relance nécessaire.",
  },
  {
    icon: UserCheck,
    title: "Toujours le même intervenant",
    text: "Votre site, votre interlocuteur. La confiance se construit avec un visage, pas un planning.",
  },
  {
    icon: Camera,
    title: "Preuve photo après passage",
    text: "Chaque intervention se termine par des photos horodatées envoyées au client.",
  },
  {
    icon: RotateCcw,
    title: "Rattrapage sous 24-48 h",
    text: "Un point insatisfaisant ? On revient le corriger, sans discussion et sans facturation.",
  },
] as const;

function LandingPage() {
  const { result } = useSimulator();
  const byKey = Object.fromEntries(result.byActivity.map((a) => [a.key, a]));
  const ACTIVITES = [
    {
      icon: Building2,
      title: "Bureaux & commerces",
      text: "Contrats d'entretien récurrents pour petits sites : bureaux < 200 m², boutiques, cabinets.",
      share: byKey.b2b ? safePercent(byKey.b2b.ca, result.revenue) : "—",
    },
    {
      icon: Sparkles,
      title: "Vitrerie",
      text: "Vitrines et surfaces vitrées des clients sous contrat — la finition qui se voit de la rue.",
      share: byKey.glass ? safePercent(byKey.glass.ca, result.revenue) : "—",
    },
    {
      icon: BedDouble,
      title: "Rotations Airbnb",
      text: "Ménage complet entre deux locataires, photos à l'appui, créneaux serrés respectés.",
      share: byKey.airbnb ? safePercent(byKey.airbnb.ca, result.revenue) : "—",
    },
    {
      icon: Home,
      title: "Particuliers",
      text: "Ménage à la demande, sans engagement — le complément qui lisse la semaine.",
      share: byKey.private ? safePercent(byKey.private.ca, result.revenue) : "—",
    },
  ];
  const maxCa = Math.max(1, ...result.months.map((m) => m.ca));

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ============ HERO ============ */}
      <div
        className="az-grain relative overflow-hidden"
        style={{ background: "var(--gradient-primary)" }}
      >
        {/* Halos + étincelles */}
        <div
          aria-hidden="true"
          className="az-drift pointer-events-none absolute -top-24 right-[-10%] h-96 w-96 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #d9a400 0%, transparent 65%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-30%] left-[-10%] h-[28rem] w-[28rem] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #0e6e8c 0%, transparent 60%)" }}
        />
        <Spark className="left-[8%] top-[30%] hidden sm:block" size={16} delay={0.6} />
        <Spark className="right-[14%] top-[22%] hidden sm:block" size={26} delay={1.4} />
        <Spark className="left-[22%] bottom-[18%] hidden md:block" size={12} delay={2.2} />
        <Spark className="right-[7%] bottom-[30%] hidden md:block" size={18} delay={0} />

        <div className="relative mx-auto max-w-6xl px-5">
          {/* Nav */}
          <header className="az-reveal-soft flex items-center justify-between py-5">
            <BrandLockup light withTagline={false} size={42} />
            <nav className="flex items-center gap-2" aria-label="Navigation de l'accueil">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden text-white/85 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <Link to="/dictionnaire">Dictionnaire</Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="gap-1.5">
                <Link to="/synthese">
                  Ouvrir le simulateur
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </nav>
          </header>

          {/* Slogan en héros */}
          <section className="pb-40 pt-14 text-center text-white sm:pt-20">
            <p
              className="az-reveal mx-auto flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ animationDelay: "100ms" }}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#d9a400]" />
              Nettoyage professionnel · Seine-Saint-Denis & Paris
            </p>
            <h1
              className="az-reveal mx-auto mt-7 max-w-4xl font-display text-5xl font-bold leading-[1.05] sm:text-7xl"
              style={{ animationDelay: "220ms" }}
            >
              La propreté qui
              <br />
              <span className="relative inline-block">
                tient parole<span className="text-[#d9a400]">.</span>
                <svg
                  viewBox="0 0 300 14"
                  aria-hidden="true"
                  className="absolute -bottom-3 left-0 w-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M4 9 C 60 13, 120 4, 170 8 S 270 11, 296 6"
                    fill="none"
                    stroke="#d9a400"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="az-dash"
                    opacity="0.9"
                  />
                </svg>
              </span>
            </h1>
            <p
              className="az-reveal mx-auto mt-8 max-w-xl text-base leading-relaxed text-white/85"
              style={{ animationDelay: "360ms" }}
            >
              Bureaux, commerces et cabinets entretenus par un artisan qui s'engage par écrit — et
              qui pilote son entreprise avec un prévisionnel en parité stricte avec l'étude
              certifiée.
            </p>
            <div
              className="az-reveal mt-9 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: "480ms" }}
            >
              <Button asChild size="lg" variant="secondary" className="gap-2 shadow-lg">
                <Link to="/demarrage">
                  Lancer la simulation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/rapport">Voir le rapport de synthèse</Link>
              </Button>
            </div>
          </section>
        </div>

        {/* Vague de séparation */}
        <svg
          viewBox="0 0 1440 90"
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C240,95 480,20 720,45 C960,70 1200,30 1440,55 L1440,90 L0,90 Z"
            fill="var(--background)"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-5">
        {/* ============ KPI vivants ============ */}
        <section
          aria-label="Chiffres clés de la simulation courante"
          className="relative z-10 -mt-24 rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          <div className="grid gap-5 sm:grid-cols-4">
            <Kpi label="CA prévisionnel an 1" value={result.revenue} delay={500} />
            <Kpi label="Net réel an 1" value={result.realNet} delay={620} />
            <Kpi label="Net de croisière" value={result.cruiseNet} suffix="/mois" delay={740} />
            <Kpi label="Point bas de trésorerie" value={result.lowCash} delay={860} />
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Chiffres vivants : ils suivent votre simulation courante — moteur en parité vérifiée
            avec le prévisionnel Excel certifié (audit du 12/06/2026).
          </p>
        </section>

        {/* ============ Charte ============ */}
        <section className="pt-16" aria-labelledby="charte-title">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Notre politique
          </p>
          <h2
            id="charte-title"
            className="mt-2 text-center font-display text-3xl font-bold sm:text-4xl"
          >
            La charte des 4 engagements
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
            Quatre promesses écrites au contrat. Si l'une casse deux fois dans le mois, on réduit
            les volumes plutôt que de trahir la marque.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ENGAGEMENTS.map((e, i) => {
              const Icon = e.icon;
              return (
                <Card
                  key={e.title}
                  className="az-reveal border-t-2 border-t-[#d9a400]"
                  style={{ animationDelay: `${150 + i * 120}ms` }}
                >
                  <CardContent className="p-5">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold">{e.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{e.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ============ Activités ============ */}
        <section className="pt-16" aria-labelledby="activites-title">
          <h2 id="activites-title" className="text-center font-display text-3xl font-bold">
            Quatre activités, un seul niveau d'exigence
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {ACTIVITES.map((a, i) => {
              const Icon = a.icon;
              return (
                <Card
                  key={a.title}
                  className="az-reveal"
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  <CardContent className="flex gap-4 p-5">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display text-base font-semibold">{a.title}</h3>
                        <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-primary">
                          {a.share} du CA
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.text}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ============ Le simulateur ============ */}
        <section className="pt-16" aria-labelledby="simu-title">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                L'outil de pilotage
              </p>
              <h2 id="simu-title" className="mt-2 font-display text-3xl font-bold">
                Un simulateur financier complet, pas une plaquette
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Douze rubriques recalculées à chaque saisie : hypothèses, plan d'activité mois par
                mois, compte de résultat par activité, trésorerie à 30 jours, scénarios face au
                marché, analyse avancée (sensibilité, Monte-Carlo), statuts juridiques, projection 5
                ans, pilotage du réel et rapport imprimable.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  { icon: LayoutDashboard, label: "Synthèse et verdict de viabilité en direct" },
                  { icon: LineChart, label: "Trésorerie, scénarios et projection 5 ans" },
                  {
                    icon: FlaskConical,
                    label: "Analyse avancée : sensibilité, goal seek, Monte-Carlo",
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.label} className="flex items-center gap-2.5 text-muted-foreground">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      {f.label}
                    </li>
                  );
                })}
              </ul>
              <Button asChild className="mt-6 gap-2">
                <Link to="/synthese">
                  Explorer le tableau de bord
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {/* Mini-graphique animé : le CA des 12 mois (données réelles du moteur) */}
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Montée en charge — année 1
                </p>
                <div
                  className="mt-4 flex h-44 items-end gap-1.5"
                  role="img"
                  aria-label={`CA mensuel de ${euro(result.months[0]?.ca ?? 0)} à ${euro(result.months[11]?.ca ?? 0)}`}
                >
                  {result.months.map((m, i) => (
                    <div
                      key={m.month}
                      className="az-grow flex-1 rounded-t-md"
                      title={`${m.month} : ${euro(m.ca)}`}
                      style={{
                        height: `${Math.max(4, (m.ca / maxCa) * 100)}%`,
                        animationDelay: `${i * 70}ms`,
                        background:
                          i >= 9
                            ? "linear-gradient(180deg, #d9a400, #0e6e8c)"
                            : "linear-gradient(180deg, #0e6e8c, #1f3864)",
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>Sept. 2026 · {euro(result.months[0]?.ca ?? 0)}</span>
                  <span>Août 2027 · {euro(result.months[11]?.ca ?? 0)}</span>
                </div>
                <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
                  De 1 à {result.months[11] ? Math.round(result.months[11].hours) : 0} h facturées
                  par mois : la croisière (barres dorées) dépasse l'objectif dès janvier 2027.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ============ CTA final ============ */}
        <section
          className="az-grain relative mt-16 overflow-hidden rounded-3xl px-6 py-12 text-center text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Spark className="left-[10%] top-[20%] hidden sm:block" size={14} delay={1} />
          <Spark className="right-[12%] bottom-[24%] hidden sm:block" size={20} delay={2} />
          <div className="relative">
            <BrandMark size={64} className="az-shine mx-auto drop-shadow-lg" />
            <h2 className="mx-auto mt-5 max-w-lg font-display text-3xl font-bold">
              Une marque, une parole, des chiffres qui tiennent.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
              Le projet complet — étude de marché, prévisionnel certifié, statuts, formalités —
              condensé dans un outil vivant.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-7 gap-2 shadow-lg">
              <Link to="/demarrage">
                Commencer par le démarrage
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 py-10 text-xs text-muted-foreground">
          <BrandLockup size={30} withTagline={false} />
          <span>
            Prévisionnel indicatif 2026 · Seine-Saint-Denis & Paris · moteur vérifié par 83 tests de
            parité
          </span>
        </footer>
      </div>
    </div>
  );
}
