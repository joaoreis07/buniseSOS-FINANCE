import { Suspense } from "react";
import { getBillingOverview } from "@/modules/billing/services/billing.service";
import { SettingsView } from "@/modules/settings/components/settings-view";
import { getSettingsOverview } from "@/modules/settings/services/settings.service";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

export default async function SettingsPage() {
  const user = await requirePermission("settings:view");
  const [overview, billing] = await Promise.all([
    getSettingsOverview({
      companyId: user.companyId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
    }),
    getBillingOverview(user.companyId),
  ]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsView
        initialData={overview}
        billing={billing}
        canManage={hasPermission(user.role, "settings:manage")}
      />
    </Suspense>
  );
}
