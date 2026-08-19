import { NewSaleForm } from "@/modules/sales/components/new-sale-form";
import { listSalesCustomers } from "@/modules/sales/services/sales.service";
import { requirePermission } from "@/shared/lib/session";

export default async function NewSalePage() {
  const user = await requirePermission("sales:manage");
  const customers = await listSalesCustomers(user.companyId);

  return <NewSaleForm customers={customers} />;
}
