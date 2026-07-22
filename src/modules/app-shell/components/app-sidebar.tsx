"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FeatureKey, Role } from "@prisma/client";
import { Menu, X } from "lucide-react";
import { Brand } from "@/shared/components/brand";
import { hasPermission } from "@/shared/lib/rbac";
import { APP_NAV_ITEMS } from "../nav";

function NavLinks({
  role,
  flags,
  onNavigate,
}: {
  role: Role;
  flags: Record<FeatureKey, boolean>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = APP_NAV_ITEMS.filter((item) => {
    if (!hasPermission(role, item.permission)) return false;
    if (item.feature && !flags[item.feature]) return false;
    return true;
  });

  return (
    <nav className="mt-3 grid gap-1">
      {items.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/app"
            ? pathname === "/app"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
              active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                : "hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  role,
  flags,
}: {
  role: Role;
  flags: Record<FeatureKey, boolean>;
}) {
  return (
    <aside className="fixed inset-y-0 hidden w-64 border-r border-slate-800 bg-slate-950 px-4 py-6 text-slate-400 lg:block">
      <Brand light />
      <p className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        Menu principal
      </p>
      <NavLinks role={role} flags={flags} />
      <div className="absolute bottom-6 left-4 right-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <p className="text-xs font-medium text-white">Dica rápida</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-400">
          Em Financeiro você lança o que entra e o que sai.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav({
  role,
  flags,
}: {
  role: Role;
  flags: Record<FeatureKey, boolean>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-slate-950 px-4 py-6 text-slate-400 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <Brand light />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-xl text-slate-300 hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Menu principal
            </p>
            <NavLinks role={role} flags={flags} onNavigate={() => setOpen(false)} />
            <p className="mt-auto rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[11px] leading-4 text-slate-400">
              Use <span className="font-semibold text-white">Financeiro</span> para cadastrar
              entradas e saídas.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
