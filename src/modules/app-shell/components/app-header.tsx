"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FeatureKey, Role } from "@prisma/client";
import { Bell } from "lucide-react";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { GlobalSearch } from "./global-search";
import { MobileNav } from "./app-sidebar";
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
}: {
  userInitials: string;
  role: Role;
  flags: Record<FeatureKey, boolean>;
}) {
  const pathname = usePathname();
  const title = resolvePageTitle(pathname);

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-9">
      <div className="flex items-center gap-3">
        <MobileNav role={role} flags={flags} />
        <div>
          <p className="text-xs capitalize text-slate-400">{formatHeaderDate()}</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-[-0.035em]">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <Link
          href="/change-password"
          className="hidden text-xs font-medium text-slate-500 sm:block"
        >
          Alterar senha
        </Link>
        <LogoutButton className="hidden text-xs font-medium text-slate-500 sm:block" />
        <button
          className="relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
          type="button"
        >
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-600" />
        </button>
        <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-xs font-semibold text-rose-950">
          {userInitials}
        </span>
      </div>
    </header>
  );
}
