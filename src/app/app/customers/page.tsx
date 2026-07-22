import { CustomersView } from "@/modules/customers/components/customers-view";
import { listCustomers } from "@/modules/customers/services/customer.service";
import { hasPermission } from "@/shared/lib/rbac";
import { requirePermission } from "@/shared/lib/session";

type SearchParams = Promise<{ q?: string }>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePermission("customers:view");
  const params = await searchParams;
  const search = params.q?.trim() ?? "";

  const { items, total } = await listCustomers(user.companyId, {
    search: search || undefined,
    page: 1,
    pageSize: 100,
  });

  return (
    <CustomersView
      initialItems={items}
      initialTotal={total}
      initialSearch={search}
      canManage={hasPermission(user.role, "customers:manage")}
    />
  );
}
