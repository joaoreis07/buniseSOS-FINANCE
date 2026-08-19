import { notFound } from "next/navigation";
import { listFinanceCategories } from "@/modules/finance/services/finance.service";
import { requirePermission } from "@/shared/lib/session";
import { hasPermission } from "@/shared/lib/rbac";
import { getSaleDetail } from "@/modules/sales/services/sales.service";
import { SaleDetailView } from "@/modules/sales/components/sale-detail-view";

type Params = Promise<{ id: string }>;

export default async function SaleDetailPage({ params }: { params: Params }) {
  const user = await requirePermission("sales:view");
  const { id } = await params;

  const saleDetail = await getSaleDetail(user.companyId, id);
  if (!saleDetail) notFound();

  const canManage = hasPermission(user.role, "sales:manage");
  const canReceive = hasPermission(user.role, "finance:manage");

  const categories = canManage
    ? await listFinanceCategories(user.companyId, "INCOME").catch(() => [])
    : [];

  return (
    <SaleDetailView
      {...saleDetail}
      canManage={canManage}
      canReceive={canReceive}
      categories={categories}
    />
  );
}

