import type { FeatureKey } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Settings,
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
    href: "/app/finance",
    label: "Financeiro",
    title: "Financeiro",
    icon: Wallet,
    permission: "finance:view",
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
