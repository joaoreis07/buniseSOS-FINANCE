import { SalesListView } from "@/modules/sales/components/sales-list-view";
import { listSales } from "@/modules/sales/services/sales.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

export default async function SalesPage() {
  const user = await requirePermission("sales:view");
  const data = await listSales({
    companyId: user.companyId,
    filters: { period: "mes", page: 1, pageSize: 20 },
  });

  return (
    <SalesListView
      initialData={data}
      canManage={hasPermission(user.role, "sales:manage")}
    />
  );
}
