import { notFound } from "next/navigation";
import { CustomerCrmDetailView } from "@/modules/crm/components/customer-crm-detail-view";
import { getCustomerCrmDetail } from "@/modules/crm/services/crm.service";
import { listFinanceCategories } from "@/modules/finance/services/finance.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

type Params = Promise<{ id: string }>;

export default async function CustomerDetailPage({ params }: { params: Params }) {
  const user = await requirePermission("customers:view");
  const { id } = await params;

  const [detail, categories] = await Promise.all([
    getCustomerCrmDetail(user.companyId, id),
    listFinanceCategories(user.companyId, "INCOME").catch(() => []),
  ]);

  if (!detail) notFound();

  return (
    <CustomerCrmDetailView
      initialData={detail}
      categories={categories.map((item) => ({ id: item.id, name: item.name }))}
      canManageFinance={hasPermission(user.role, "finance:manage")}
      canManageCustomers={hasPermission(user.role, "customers:manage")}
    />
  );
}
