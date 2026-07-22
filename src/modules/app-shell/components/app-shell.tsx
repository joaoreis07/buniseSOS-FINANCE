import type { FeatureKey, Role } from "@prisma/client";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export function AppShell({
  children,
  role,
  flags,
  userInitials,
}: {
  children: React.ReactNode;
  role: Role;
  flags: Record<FeatureKey, boolean>;
  userInitials: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar role={role} flags={flags} />
      <div className="lg:pl-64">
        <AppHeader userInitials={userInitials} role={role} flags={flags} />
        <main className="mx-auto max-w-7xl p-5 lg:p-9">{children}</main>
      </div>
    </div>
  );
}
