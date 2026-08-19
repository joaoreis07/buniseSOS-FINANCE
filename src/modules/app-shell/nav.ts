import type { FeatureKey } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  FileBarChart2,
  Handshake,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import type { Permission } from "@/shared/lib/rbac";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  feature?: FeatureKey;
  title: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: "/app",
    label: "Visão geral",
    title: "Visão geral",
    icon: LayoutDashboard,
    permission: "dashboard:view",
  },
  {
    href: "/app/insights",
    label: "Saúde do caixa",
    title: "Saúde do seu caixa",
    icon: Sparkles,
    permission: "finance:view",
  },
  {
    href: "/app/finance",
    label: "Financeiro",
    title: "Financeiro",
    icon: Wallet,
    permission: "finance:view",
  },
  {
    href: "/app/sales",
    label: "Vendas",
    title: "Vendas",
    icon: ShoppingBag,
    permission: "sales:view",
  },
  {
    href: "/app/calendar",
    label: "Agenda",
    title: "Agenda do dinheiro",
    icon: CalendarDays,
    permission: "finance:view",
  },
  {
    href: "/app/receivables",
    label: "Parcelas",
    title: "Parcelas a receber",
    icon: Handshake,
    permission: "finance:view",
  },
  {
    href: "/app/reports",
    label: "Meta",
    title: "Meta e acompanhamento",
    icon: Target,
    permission: "reports:view",
    feature: "reports",
  },
  {
    href: "/app/relatorios",
    label: "Relatórios",
    title: "Relatórios profissionais",
    icon: FileBarChart2,
    permission: "reports:view",
    feature: "reports",
  },
  {
    href: "/app/customers",
    label: "Clientes",
    title: "Clientes",
    icon: Users,
    permission: "customers:view",
  },
  {
    href: "/app/settings",
    label: "Configurações",
    title: "Configurações",
    icon: Settings,
    permission: "settings:view",
  },
];

export function resolvePageTitle(pathname: string): string {
  const exact = APP_NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) {
    return exact.title;
  }
  const nested = APP_NAV_ITEMS.find(
    (item) => item.href !== "/app" && pathname.startsWith(item.href),
  );
  return nested?.title ?? "Painel";
}
