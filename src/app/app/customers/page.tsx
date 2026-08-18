import { CustomersCrmView } from "@/modules/crm/components/customers-crm-view";
import { listCustomersCrm } from "@/modules/crm/services/crm.service";
import { listFinanceCategories } from "@/modules/finance/services/finance.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

export default async function CustomersPage() {
  const user = await requirePermission("customers:view");
  const [items, categories] = await Promise.all([
    listCustomersCrm(user.companyId),
    listFinanceCategories(user.companyId, "INCOME").catch(() => []),
  ]);

  return (
    <CustomersCrmView
      initialItems={items}
      categories={categories.map((item) => ({ id: item.id, name: item.name }))}
      canManageCustomers={hasPermission(user.role, "customers:manage")}
      canManageFinance={hasPermission(user.role, "finance:manage")}
    />
  );
}
