import { redirect } from "next/navigation";
import { FileBarChart2 } from "lucide-react";
import { ComingSoonPage } from "@/shared/components/coming-soon-page";
import { requirePermission } from "@/shared/lib/session";
import { isFeatureEnabled } from "@/shared/services/feature-flags.service";

export default async function ReportsPage() {
  const user = await requirePermission("reports:view");
  const enabled = await isFeatureEnabled(user.companyId, "reports");
  if (!enabled) {
    redirect("/app");
  }

  return (
    <ComingSoonPage
      title="Relatórios"
      description="Indicadores avançados e exportações."
      icon={FileBarChart2}
    />
  );
}
