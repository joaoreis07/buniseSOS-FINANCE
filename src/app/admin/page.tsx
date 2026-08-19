import { PlatformAdminView } from "@/modules/platform-admin/components/platform-admin-view";
import { PlatformAdminForbidden } from "@/modules/platform-admin/components/platform-admin-forbidden";
import { getPlatformAdminOverview } from "@/modules/platform-admin/services/platform-admin.service";
import { isPlatformAdminEmail } from "@/shared/lib/platform-admin";
import { requireSession } from "@/shared/lib/session";

export default async function PlatformAdminPage() {
  const user = await requireSession();

  if (!isPlatformAdminEmail(user.email)) {
    return <PlatformAdminForbidden userEmail={user.email} />;
  }

  const data = await getPlatformAdminOverview();
  return <PlatformAdminView initialData={data} />;
}
