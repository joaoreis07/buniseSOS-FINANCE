import { ReceivablesView } from "@/modules/crm/components/receivables-view";
import { getReceivablesOverview, listCustomersCrm } from "@/modules/crm/services/crm.service";
import { listFinanceCategories } from "@/modules/finance/services/finance.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

export default async function ReceivablesPage() {
  const user = await requirePermission("finance:view");
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [data, customers, categories] = await Promise.all([
    getReceivablesOverview(user.companyId, { yearMonth, status: "all" }),
    listCustomersCrm(user.companyId),
    listFinanceCategories(user.companyId, "INCOME").catch(() => []),
  ]);

  return (
    <ReceivablesView
      initialData={data}
      customers={customers.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        whatsapp: item.whatsapp,
      }))}
      categories={categories.map((item) => ({ id: item.id, name: item.name }))}
      canManage={hasPermission(user.role, "finance:manage")}
    />
  );
}
