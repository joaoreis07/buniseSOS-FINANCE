import { FinanceDashboard } from "@/modules/finance/components/finance-dashboard";
import { getFinanceOverview } from "@/modules/finance/services/finance.service";
import { listCustomers } from "@/modules/customers/services/customer.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

export default async function FinancePage() {
  const user = await requirePermission("finance:view");
  const [overview, customers] = await Promise.all([
    getFinanceOverview(user.companyId),
    listCustomers(user.companyId, { page: 1, pageSize: 100, status: "ACTIVE" }),
  ]);

  return (
    <FinanceDashboard
      initialData={overview}
      customers={customers.items.map((item) => ({ id: item.id, name: item.name }))}
      canManage={hasPermission(user.role, "finance:manage")}
    />
  );
}
