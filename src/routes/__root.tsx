import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SimulatorProvider } from "@/components/simulator-provider";
import { SimulatorHeader } from "@/components/simulator/simulator-nav";
import { AppSidebar } from "@/components/simulator/app-sidebar";
import { HypothesesRecap } from "@/components/simulator/hypotheses-recap";
import { WelcomeDialog } from "@/components/simulator/welcome-dialog";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

// Applique le thème sauvegardé AVANT la première peinture (pas de flash clair→sombre).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("az-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour au simulateur
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu se charger
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue de notre côté. Vous pouvez réessayer ou revenir à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "L'AZ du Clean — Simulateur financier" },
      {
        name: "description",
        content:
          "Simulateur professionnel de viabilité financière et juridique pour L'AZ du Clean — nettoyage B2B en Seine-Saint-Denis & Paris.",
      },
      { name: "author", content: "L'AZ du Clean" },
      { property: "og:title", content: "L'AZ du Clean — Simulateur financier" },
      { property: "og:description", content: "La propreté qui tient parole." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "L'AZ du Clean — Simulateur financier" },
      { name: "twitter:description", content: "La propreté qui tient parole." },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f4219723-20b8-4d4e-8b34-188d78a2ac40",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f4219723-20b8-4d4e-8b34-188d78a2ac40",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/logo.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap",
      },
    ],
    scripts: [
      { children: THEME_SCRIPT },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "L'AZ du Clean — Simulateur financier",
          description:
            "Simulateur financier et juridique du projet de nettoyage professionnel L'AZ du Clean : prévisionnel, trésorerie, scénarios, statuts.",
          inLanguage: "fr-FR",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SimulatorShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // La landing (/) s'affiche en pleine page, hors chrome du simulateur.
  if (pathname === "/")
    return (
      <main>
        <Outlet />
      </main>
    );
  const showRecap = pathname !== "/hypotheses";
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <SimulatorHeader />
        <main className="max-w-[1500px] w-full mx-auto px-4 sm:px-5 py-6">
          {showRecap && <HypothesesRecap />}
          <Outlet />
        </main>
      </SidebarInset>
      <WelcomeDialog />
    </SidebarProvider>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <SimulatorProvider>
        <TooltipProvider delayDuration={150}>
          <SimulatorShell />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </SimulatorProvider>
    </QueryClientProvider>
  );
}
