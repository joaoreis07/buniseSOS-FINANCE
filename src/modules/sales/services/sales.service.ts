import { getSaleCrmDetail, listSales as listSalesFromCrm } from "@/modules/crm/services/crm.service";
import { listCustomers } from "@/modules/customers/services/customer.service";
import type { ListSalesInput, SaleDetailDTO, SaleListResultDTO } from "@/modules/crm/dto/crm.dto";

export async function listSales(params: {
  companyId: string;
  filters?: ListSalesInput;
}): Promise<SaleListResultDTO> {
  return listSalesFromCrm(params);
}

export async function listSalesCustomers(companyId: string): Promise<Array<{ id: string; name: string }>> {
  const result = await listCustomers(companyId, {
    status: "ACTIVE",
    page: 1,
    pageSize: 200,
  });
  return result.items.map((item) => ({ id: item.id, name: item.name }));
}

export async function getSaleDetail(
  companyId: string,
  saleId: string,
): Promise<SaleDetailDTO | null> {
  return getSaleCrmDetail(companyId, saleId);
}

