import { Link } from "@tanstack/react-router";
import {
  SlidersHorizontal,
  LayoutDashboard,
  ClipboardList,
  FileDown,
  FileText,
  FlaskConical,
  LineChart,
  BarChart3,
  CalendarRange,
  Landmark,
  Rocket,
  BookOpenText,
  CalendarDays,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

// Groupes : saisie → résultats → analyse → annexes (architecture du simulateur socle)
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Démarrer",
    items: [
      { to: "/demarrage", label: "Démarrage", icon: Rocket },
      { to: "/hypotheses", label: "Hypothèses", icon: SlidersHorizontal },
      { to: "/activite", label: "Plan d’activité", icon: CalendarDays },
    ],
  },
  {
    label: "Résultats",
    items: [
      { to: "/synthese", label: "Synthèse", icon: LayoutDashboard, exact: true },
      { to: "/compte-resultat", label: "Compte de résultat", icon: FileText },
      { to: "/tresorerie", label: "Trésorerie", icon: LineChart },
      { to: "/pilotage", label: "Pilotage réel", icon: ClipboardList },
    ],
  },
  {
    label: "Analyse",
    items: [
      { to: "/scenarios", label: "Scénarios", icon: BarChart3 },
      { to: "/analyse", label: "Analyse avancée", icon: FlaskConical },
      { to: "/projection", label: "Projection 5 ans", icon: CalendarRange },
      { to: "/statuts", label: "Statuts juridiques", icon: Landmark },
    ],
  },
  {
    label: "Annexes",
    items: [
      { to: "/rapport", label: "Rapport (PDF)", icon: FileDown },
      { to: "/facturation", label: "Facture / Devis", icon: ReceiptText },
      { to: "/dictionnaire", label: "Dictionnaire", icon: BookOpenText },
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <Link
          to="/"
          aria-label="Retour à l'accueil"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <BrandMark
            size={32}
            className="shrink-0 drop-shadow-sm group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7"
          />
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">
              Simulateur
            </span>
            <span className="font-display text-sm font-semibold truncate">L’AZ du Clean</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <Link
                          to={item.to}
                          activeOptions={{ exact: item.exact === true }}
                          activeProps={{
                            className:
                              "bg-sidebar-primary/15 text-sidebar-primary font-semibold data-[active=true]:bg-sidebar-primary/15",
                            "data-active": "true",
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <div className="mt-auto px-4 py-3 text-[10px] leading-4 text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden">
        <Sparkles className="mb-1 h-3 w-3 text-sidebar-primary" aria-hidden="true" />
        La propreté qui tient parole.
        <br />
        Seine-Saint-Denis & Paris · 2026
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
