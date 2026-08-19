import { AppShell } from "@/modules/app-shell/components/app-shell";
import { isDemoAccountEmail } from "@/shared/lib/demo-account";
import { isPlatformAdminEmail } from "@/shared/lib/platform-admin";
import { getFeatureFlags } from "@/shared/services/feature-flags.service";
import { getUserInitials, requireSession } from "@/shared/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  const flags = await getFeatureFlags(user.companyId);

  return (
    <AppShell
      role={user.role}
      flags={flags}
      userInitials={getUserInitials(user.name, user.email)}
      isDemo={isDemoAccountEmail(user.email)}
      isPlatformAdmin={isPlatformAdminEmail(user.email)}
    >
      {children}
    </AppShell>
  );
}
