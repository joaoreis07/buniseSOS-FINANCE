import { revalidateTag } from "next/cache";
import { assertCanCreateCustomer } from "@/modules/billing/services/billing.service";
import { PrismaAuditLogRepository } from "@/shared/repositories/prisma-repositories";
import { getDashboardCacheTag } from "@/modules/dashboard/services/dashboard.service";
import type {
  CreateCustomerDTO,
  CustomerClientDTO,
  CustomerDetailClientDTO,
  CustomerListParams,
  CustomerResponseDTO,
  UpdateCustomerDTO,
} from "../dto/customer.dto";
import { PrismaCustomerRepository } from "../repositories/prisma-customer.repository";

const customers = new PrismaCustomerRepository();
const auditLogs = new PrismaAuditLogRepository();

export function getCustomersCacheTag(companyId: string): string {
  return `customers:${companyId}`;
}

export function toCustomerClientDTO(customer: CustomerResponseDTO): CustomerClientDTO {
  return {
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function invalidateCustomerCaches(companyId: string): void {
  try {
    revalidateTag(getCustomersCacheTag(companyId));
    revalidateTag(getDashboardCacheTag(companyId));
  } catch {
    // Outside Next.js request context (scripts/tests)
  }
}

export async function listCustomers(
  companyId: string,
  params?: CustomerListParams,
): Promise<{ items: CustomerClientDTO[]; total: number }> {
  const result = await customers.list(companyId, params);
  return {
    items: result.items.map(toCustomerClientDTO),
    total: result.total,
  };
}

export async function getCustomerDetail(
  companyId: string,
  id: string,
): Promise<CustomerDetailClientDTO | null> {
  const detail = await customers.getDetail(companyId, id);
  if (!detail) {
    return null;
  }
  return {
    customer: toCustomerClientDTO(detail.customer),
    history: detail.history,
    summary: detail.summary,
  };
}

export async function createCustomer(params: {
  companyId: string;
  userId: string;
  data: CreateCustomerDTO;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<CustomerClientDTO> {
  await assertCanCreateCustomer(params.companyId);
  const created = await customers.create(params.companyId, params.data);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "customers",
    action: "create",
    entity: "Customer",
    entityId: created.id,
    metadata: { name: created.name },
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateCustomerCaches(params.companyId);
  return toCustomerClientDTO(created);
}

export async function updateCustomer(params: {
  companyId: string;
  userId: string;
  id: string;
  data: UpdateCustomerDTO;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<CustomerClientDTO> {
  const updated = await customers.update(params.companyId, params.id, params.data);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "customers",
    action: "update",
    entity: "Customer",
    entityId: updated.id,
    metadata: { name: updated.name },
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateCustomerCaches(params.companyId);
  return toCustomerClientDTO(updated);
}

export async function deleteCustomer(params: {
  companyId: string;
  userId: string;
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await customers.softDelete(params.companyId, params.id);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "customers",
    action: "soft_delete",
    entity: "Customer",
    entityId: params.id,
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateCustomerCaches(params.companyId);
}
