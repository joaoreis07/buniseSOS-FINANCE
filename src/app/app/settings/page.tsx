import { SettingsView } from "@/modules/settings/components/settings-view";
import { getSettingsOverview } from "@/modules/settings/services/settings.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

export default async function SettingsPage() {
  const user = await requirePermission("settings:view");
  const overview = await getSettingsOverview({
    companyId: user.companyId,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role,
  });

  return (
    <SettingsView
      initialData={overview}
      canManage={hasPermission(user.role, "settings:manage")}
    />
  );
}
