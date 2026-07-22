import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";
import { getDashboardData } from "@/modules/dashboard/services/dashboard.service";
import { hasPermission } from "@/shared/lib/rbac";
import { getFirstName, requirePermission } from "@/shared/lib/session";

export default async function AppHomePage() {
  const user = await requirePermission("dashboard:view");
  const dashboard = await getDashboardData(user.companyId);

  return (
    <DashboardOverview
      userName={getFirstName(user.name)}
      initialData={dashboard}
      canManageFinance={hasPermission(user.role, "finance:manage")}
      canManageCustomers={hasPermission(user.role, "customers:manage")}
    />
  );
}
