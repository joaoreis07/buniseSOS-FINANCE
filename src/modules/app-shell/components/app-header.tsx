"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FeatureKey, Role } from "@prisma/client";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { NotificationsCenter } from "@/modules/notifications/components/notifications-center";
import { GlobalSearch } from "./global-search";
import { MobileNav } from "./app-sidebar";
import { ExitDemoButton } from "./exit-demo-button";
import { resolvePageTitle } from "../nav";

function formatHeaderDate(date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function AppHeader({
  userInitials,
  role,
  flags,
  isDemo = false,
  isPlatformAdmin = false,
}: {
  userInitials: string;
  role: Role;
  flags: Record<FeatureKey, boolean>;
  isDemo?: boolean;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const title = resolvePageTitle(pathname);

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-9">
      <div className="flex items-center gap-3">
        <MobileNav role={role} flags={flags} isDemo={isDemo} />
        <div>
          <p className="text-xs capitalize text-slate-400">{formatHeaderDate()}</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-[-0.035em]">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isDemo ? <ExitDemoButton className="hidden sm:inline-flex" /> : null}
        {isPlatformAdmin ? (
          <Link
            href="/admin"
            className="hidden text-xs font-semibold text-violet-700 sm:block"
          >
            Console admin
          </Link>
        ) : null}
        <GlobalSearch />
        {!isDemo ? (
          <Link
            href="/change-password"
            className="hidden text-xs font-medium text-slate-500 sm:block"
          >
            Alterar senha
          </Link>
        ) : null}
        {!isDemo ? (
          <LogoutButton className="hidden text-xs font-medium text-slate-500 sm:block" />
        ) : null}
        <NotificationsCenter />
        <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-xs font-semibold text-rose-950">
          {userInitials}
        </span>
      </div>
    </header>
  );
}
