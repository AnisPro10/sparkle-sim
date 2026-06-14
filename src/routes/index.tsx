import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  Camera,
  FileCheck2,
  Home,
  LineChart,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { euro, safePercent } from "@/lib/simulator-model";
import { useSimulator } from "@/components/simulator-provider";
import { BrandMark } from "@/components/brand/logo";
import { MagneticCursor } from "@/components/landing/magnetic-cursor";
import { MagneticButton } from "@/components/landing/magnetic-button";
import { TiltCard } from "@/components/landing/tilt-card";
import { BubbleField } from "@/components/landing/bubble-field";
import { BeforeAfter } from "@/components/landing/before-after";
import { Marquee } from "@/components/landing/marquee";
import bureauImg from "@/assets/landing-bureau.jpg";
import airbnbImg from "@/assets/landing-airbnb.jpg";

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

/* Compteur animé respectant prefers-reduced-motion (SSR-safe). */
function useCountUp(target: number, duration = 1600) {
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

const ENGAGEMENTS = [
  {
    icon: FileCheck2,
    title: "Devis sous 48 h",
    text: "Visite, métrage, proposition écrite en deux jours ouvrés.",
  },
  {
    icon: UserCheck,
    title: "Même intervenant",
    text: "Votre site, votre interlocuteur. Toujours.",
  },
  {
    icon: Camera,
    title: "Preuve photo",
    text: "Photos horodatées envoyées après chaque passage.",
  },
  {
    icon: RotateCcw,
    title: "Rattrapage 24-48 h",
    text: "Un point insatisfaisant ? On revient, sans facturer.",
  },
] as const;

function LandingPage() {
  const { result } = useSimulator();
  const byKey = Object.fromEntries(result.byActivity.map((a) => [a.key, a]));

  // Marque le body comme « landing » pour scoper le curseur custom (CSS).
  useEffect(() => {
    document.body.dataset.landing = "true";
    return () => {
      delete document.body.dataset.landing;
    };
  }, []);

  // Parallax léger sur le hero
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  const ACTIVITES = [
    {
      icon: Building2,
      title: "Bureaux & commerces",
      text: "Contrats d'entretien récurrents pour bureaux < 200 m², boutiques, cabinets.",
      share: byKey.b2b ? safePercent(byKey.b2b.ca, result.revenue) : "—",
    },
    {
      icon: Sparkles,
      title: "Vitrerie",
      text: "Vitrines et surfaces vitrées — la finition qui se voit de la rue.",
      share: byKey.glass ? safePercent(byKey.glass.ca, result.revenue) : "—",
    },
    {
      icon: BedDouble,
      title: "Rotations Airbnb",
      text: "Ménage complet entre deux locataires, photos à l'appui.",
      share: byKey.airbnb ? safePercent(byKey.airbnb.ca, result.revenue) : "—",
    },
    {
      icon: Home,
      title: "Particuliers",
      text: "Ménage à la demande, sans engagement.",
      share: byKey.private ? safePercent(byKey.private.ca, result.revenue) : "—",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <MagneticCursor />

      {/* ============================== HERO ============================== */}
      <section
        ref={heroRef}
        className="relative isolate min-h-[100svh] overflow-hidden"
        style={{ background: "var(--gradient-primary)" }}
      >
        {/* Halos animés + bulles */}
        <motion.div
          style={{ y: bgY }}
          aria-hidden
          className="absolute inset-0 -z-10"
        >
          <div
            className="absolute -top-32 right-[-15%] h-[34rem] w-[34rem] rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, #d9a400 0%, transparent 65%)" }}
          />
          <div
            className="absolute bottom-[-25%] left-[-10%] h-[30rem] w-[30rem] rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #0e6e8c 0%, transparent 60%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </motion.div>
        <BubbleField count={22} />

        {/* Nav */}
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <BrandMark size={42} className="drop-shadow-lg" />
            <div className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-base font-bold tracking-tight text-white">
                L'AZ du Clean
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-[#d9a400]">
                Paris · Seine-Saint-Denis
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Navigation">
            <Link
              to="/dictionnaire"
              className="hidden text-sm font-medium text-white/75 hover:text-white sm:inline"
            >
              Dictionnaire
            </Link>
            <Link
              to="/rapport"
              className="hidden text-sm font-medium text-white/75 hover:text-white sm:inline"
            >
              Rapport
            </Link>
            <MagneticButton href="/synthese" variant="primary" className="px-5 py-2.5 text-xs">
              Ouvrir le simulateur <ArrowUpRight className="h-3.5 w-3.5" />
            </MagneticButton>
          </nav>
        </header>

        {/* Titre XXL */}
        <motion.div
          style={{ y: titleY }}
          className="relative z-10 mx-auto flex min-h-[80svh] max-w-7xl flex-col items-start justify-center px-5 pb-24 pt-16 sm:px-8"
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#d9a400]" />
            Nettoyage professionnel certifié
          </motion.span>

          <h1 className="mt-8 font-display text-[15vw] font-bold leading-[0.92] tracking-[-0.04em] text-white sm:text-[10vw] lg:text-[8.5rem]">
            <motion.span
              initial={{ opacity: 0, y: 60, skewY: 4 }}
              animate={{ opacity: 1, y: 0, skewY: 0 }}
              transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
              className="block"
            >
              La propreté
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 60, skewY: 4 }}
              animate={{ opacity: 1, y: 0, skewY: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
              className="block"
            >
              qui <span className="italic text-[#d9a400]">tient</span>
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 60, skewY: 4 }}
              animate={{ opacity: 1, y: 0, skewY: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="block"
            >
              parole.
            </motion.span>
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 grid w-full gap-8 lg:grid-cols-[1fr_auto] lg:items-end"
          >
            <p className="max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Un artisan qui s'engage par écrit. Un simulateur financier vivant pour piloter son
              entreprise — en parité stricte avec l'étude certifiée.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <MagneticButton href="/demarrage" variant="primary">
                Lancer la simulation <ArrowRight className="h-4 w-4" />
              </MagneticButton>
              <MagneticButton href="/rapport" variant="ghost">
                Voir le rapport
              </MagneticButton>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60"
        >
          Défiler
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-8 w-px bg-gradient-to-b from-white/60 to-transparent"
          />
        </motion.div>
      </section>

      {/* Marquee sectoriel */}
      <div className="border-y border-border bg-card/50 py-5">
        <Marquee speed={45}>
          {[
            "Bureaux",
            "Vitrerie",
            "Cabinets médicaux",
            "Boutiques",
            "Airbnb",
            "Coworking",
            "Cliniques",
            "Particuliers",
            "Restaurants",
          ].map((label) => (
            <span
              key={label}
              className="flex items-center gap-4 font-display text-2xl font-semibold uppercase tracking-tight text-foreground/40 sm:text-3xl"
            >
              {label}
              <span className="h-2 w-2 rounded-full bg-[#d9a400]" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* ============================== BENTO 1 ============================== */}
      <section className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-4 sm:grid-cols-6 sm:[grid-auto-rows:minmax(0,1fr)]">
          {/* Tuile XL Avant/Après */}
          <TiltCard className="sm:col-span-4 sm:row-span-2 sm:min-h-[28rem]">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between p-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9a400]">
                    Notre signature
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">
                    Glissez la poignée.
                    <br />
                    Découvrez la différence.
                  </h2>
                </div>
                <Sparkles className="h-8 w-8 shrink-0 text-[#d9a400]" />
              </div>
              <div className="relative min-h-[18rem] flex-1 overflow-hidden">
                <BeforeAfter />
              </div>
            </div>
          </TiltCard>

          {/* KPI CA */}
          <KpiTile
            label="CA prévisionnel an 1"
            value={result.revenue}
            suffix=""
            accent="from-[#0e6e8c] to-[#1f3864]"
            className="sm:col-span-2"
          />

          {/* KPI Net */}
          <KpiTile
            label="Net réel an 1"
            value={result.realNet}
            accent="from-[#d9a400] to-[#b8860b]"
            gold
            className="sm:col-span-2"
          />
        </div>

        {/* Ligne 2 */}
        <div className="mt-4 grid gap-4 sm:grid-cols-6">
          {/* Charte 4 engagements */}
          <TiltCard className="sm:col-span-4">
            <div className="p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9a400]">
                Charte des 4 engagements
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">
                Promesses écrites au contrat.
              </h3>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {ENGAGEMENTS.map((e, i) => {
                  const Icon = e.icon;
                  return (
                    <motion.div
                      key={e.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: i * 0.08 }}
                      className="group flex gap-3"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-[#d9a400] group-hover:text-[#0c2340] group-hover:rotate-6">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="font-display text-base font-semibold">{e.title}</h4>
                        <p className="mt-0.5 text-sm text-muted-foreground">{e.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </TiltCard>

          {/* Tuile image bureau */}
          <TiltCard className="relative sm:col-span-2 sm:min-h-[20rem]">
            <img
              src={bureauImg}
              alt="Bureau impeccable baigné de lumière"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c2340] via-[#0c2340]/30 to-transparent" />
            <div className="relative flex h-full min-h-[20rem] flex-col justify-end p-6 text-white">
              <Building2 className="h-7 w-7 text-[#d9a400]" />
              <p className="mt-3 font-display text-xl font-bold leading-tight">
                Des bureaux qui inspirent confiance dès la porte.
              </p>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* ============================== ACTIVITÉS ============================== */}
      <section className="relative mx-auto max-w-7xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Nos terrains
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
              Quatre activités,
              <br />
              <span className="italic text-[#d9a400]">un seul niveau</span> d'exigence.
            </h2>
          </div>
          <Link
            to="/activite"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Voir le plan d'activité
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIVITES.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <TiltCard className="h-full" intensity={6}>
                  <div className="flex h-full flex-col p-6">
                    <span
                      className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-bold">{a.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {a.text}
                    </p>
                    <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Part du CA
                      </span>
                      <span className="font-mono text-2xl font-bold tabular-nums text-primary">
                        {a.share}
                      </span>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================== SIMULATEUR ============================== */}
      <section className="relative overflow-hidden bg-[#0c2340] py-24 text-white sm:py-32">
        <div
          aria-hidden
          className="absolute -right-40 top-1/2 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #d9a400 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9a400]">
              L'outil de pilotage
            </p>
            <h2 className="mt-3 font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
              Pas une plaquette.
              <br />
              <span className="italic text-[#d9a400]">Un simulateur</span> vivant.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/75">
              Dix écrans branchés sur un moteur en parité stricte avec l'étude certifiée :
              hypothèses, plan d'activité, compte de résultat, trésorerie, scénarios, projection 5
              ans.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Verdict de viabilité en temps réel",
                "Trésorerie à 30 jours, point bas calculé",
                "Sensibilité, goal seek, Monte-Carlo",
                "Rapport imprimable, statuts juridiques comparés",
              ].map((label, i) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-sm text-white/85"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#d9a400] text-[#0c2340]">
                    <LineChart className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </motion.li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <MagneticButton href="/synthese" variant="primary">
                Ouvrir la synthèse <ArrowRight className="h-4 w-4" />
              </MagneticButton>
              <MagneticButton href="/projection" variant="ghost">
                Projection 5 ans
              </MagneticButton>
            </div>
          </div>

          {/* Mini-dashboard live */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#d9a400]/40 to-[#0e6e8c]/40 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-white/60">L'AZ DU CLEAN · SIMULATEUR</span>
                <span className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <MiniStat label="Net croisière" value={`${euro(result.cruiseNet)}/mois`} />
                <MiniStat label="Point bas tréso" value={euro(result.lowCash)} />
              </div>
              <ChartMonths />
              <p className="mt-3 text-[10px] text-white/50">
                Données vivantes — recalculées à chaque hypothèse. Parité 83/83 tests.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== CITATION ============================== */}
      <section className="relative mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <span className="font-display text-7xl leading-none text-[#d9a400] sm:text-9xl">"</span>
          <p className="-mt-6 font-display text-3xl font-medium leading-snug tracking-tight sm:text-5xl">
            On ne vend pas du nettoyage. On vend une <span className="italic text-[#d9a400]">parole</span> qui
            tient et un site qui brille — semaine après semaine.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <BrandMark size={48} />
            <div className="text-left">
              <p className="font-display text-base font-bold">L'artisan derrière L'AZ du Clean</p>
              <p className="text-xs text-muted-foreground">Seine-Saint-Denis · Paris · 2026</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================== CTA FINAL ============================== */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-20 text-center text-white sm:px-16 sm:py-28"
          style={{ background: "var(--gradient-primary)" }}
        >
          <BubbleField count={10} />
          <img
            src={airbnbImg}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-10 mix-blend-luminosity"
          />
          <div className="relative">
            <BrandMark size={72} className="az-shine mx-auto drop-shadow-2xl" />
            <h2 className="mx-auto mt-8 max-w-3xl font-display text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
              Une marque, une parole,
              <br />
              <span className="italic text-[#d9a400]">des chiffres qui tiennent.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-sm text-white/80 sm:text-base">
              Étude de marché, prévisionnel certifié, statuts, formalités — condensés dans un outil
              vivant que vous pouvez explorer en quelques clics.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <MagneticButton href="/demarrage" variant="primary">
                Commencer par le démarrage <ArrowRight className="h-4 w-4" />
              </MagneticButton>
              <MagneticButton href="/synthese" variant="ghost">
                Voir la synthèse
              </MagneticButton>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <BrandMark size={44} />
              <div>
                <p className="font-display text-lg font-bold">L'AZ du Clean</p>
                <p className="text-xs italic text-muted-foreground">
                  La propreté qui tient parole.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
              <Link to="/synthese" className="text-muted-foreground hover:text-primary">
                Synthèse
              </Link>
              <Link to="/hypotheses" className="text-muted-foreground hover:text-primary">
                Hypothèses
              </Link>
              <Link to="/tresorerie" className="text-muted-foreground hover:text-primary">
                Trésorerie
              </Link>
              <Link to="/scenarios" className="text-muted-foreground hover:text-primary">
                Scénarios
              </Link>
              <Link to="/rapport" className="text-muted-foreground hover:text-primary">
                Rapport
              </Link>
              <Link to="/dictionnaire" className="text-muted-foreground hover:text-primary">
                Dictionnaire
              </Link>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-6 text-[11px] text-muted-foreground">
            <span>© 2026 L'AZ du Clean · Seine-Saint-Denis & Paris</span>
            <span>Prévisionnel indicatif · moteur vérifié par 83 tests de parité</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ----------------------------- sous-composants ----------------------------- */

function KpiTile({
  label,
  value,
  suffix,
  accent,
  gold,
  className,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent: string;
  gold?: boolean;
  className?: string;
}) {
  const v = useCountUp(value);
  return (
    <TiltCard className={cn("min-h-[14rem]", className)} intensity={5}>
      <div
        className={cn(
          "relative h-full overflow-hidden p-6 sm:p-7",
          gold ? "text-[#0c2340]" : "text-white",
        )}
      >
        <div className={cn("absolute inset-0 -z-0 bg-gradient-to-br", accent)} />
        <div
          aria-hidden
          className="absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-30 blur-2xl"
          style={{ background: gold ? "#fff" : "#d9a400" }}
        />
        <div className="relative flex h-full flex-col justify-between">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.22em]",
              gold ? "text-[#0c2340]/70" : "text-white/70",
            )}
          >
            {label}
          </p>
          <div className="mt-4">
            <p className="font-display text-5xl font-bold leading-none tracking-tight tabular-nums sm:text-6xl">
              {euro(v)}
            </p>
            {suffix && (
              <span className={cn("mt-1 block text-xs", gold ? "text-[#0c2340]/70" : "text-white/70")}>
                {suffix}
              </span>
            )}
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function ChartMonths() {
  const { result } = useSimulator();
  const maxCa = Math.max(1, ...result.months.map((m) => m.ca));
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-[10px] text-white/50">
        <span>Montée en charge — 12 mois</span>
        <span className="font-mono">{euro(result.months[11]?.ca ?? 0)} / mois</span>
      </div>
      <div className="mt-3 flex h-32 items-end gap-1">
        {result.months.map((m, i) => (
          <motion.div
            key={m.month}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
            className="flex-1 origin-bottom rounded-t-md"
            style={{
              height: `${Math.max(4, (m.ca / maxCa) * 100)}%`,
              background:
                i >= 9
                  ? "linear-gradient(180deg, #d9a400, #b8860b)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.15))",
            }}
            title={`${m.month} : ${euro(m.ca)}`}
          />
        ))}
      </div>
    </div>
  );
}
