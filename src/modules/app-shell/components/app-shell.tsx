"use client";

import type { FeatureKey, Role } from "@prisma/client";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { SignupCtaBalloon } from "@/modules/marketing/components/signup-cta-balloon";

export function AppShell({
  children,
  role,
  flags,
  userInitials,
  isDemo = false,
  isPlatformAdmin = false,
}: {
  children: React.ReactNode;
  role: Role;
  flags: Record<FeatureKey, boolean>;
  userInitials: string;
  isDemo?: boolean;
  isPlatformAdmin?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar role={role} flags={flags} isDemo={isDemo} />
      <div className="lg:pl-64">
        <AppHeader
          userInitials={userInitials}
          role={role}
          flags={flags}
          isDemo={isDemo}
          isPlatformAdmin={isPlatformAdmin}
        />
        <main className="mx-auto max-w-7xl p-5 lg:p-9">{children}</main>
      </div>
      {isDemo ? <SignupCtaBalloon variant="floating" /> : null}
    </div>
  );
}
