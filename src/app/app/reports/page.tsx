import { redirect } from "next/navigation";
import { MonthlyReportView } from "@/modules/reports/components/monthly-report-view";
import { getMonthlyReportData } from "@/modules/reports/services/reports.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";
import { isFeatureEnabled } from "@/shared/services/feature-flags.service";

export default async function ReportsPage() {
  const user = await requirePermission("reports:view");
  const enabled = await isFeatureEnabled(user.companyId, "reports");
  if (!enabled) {
    redirect("/app");
  }

  const report = await getMonthlyReportData(user.companyId);

  return (
    <MonthlyReportView
      initialData={report}
      canEditGoal={hasPermission(user.role, "settings:manage")}
    />
  );
}
