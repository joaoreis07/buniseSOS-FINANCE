import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";

export async function assertCategoryBelongsToTenant(
  companyId: string,
  categoryId: string | null | undefined,
): Promise<void> {
  if (!categoryId) {
    return;
  }
  assertTenantId(companyId);
  const category = await prisma.category.findFirst({
    where: { id: categoryId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Categoria não encontrada");
  }
}

export async function assertCustomerBelongsToTenant(
  companyId: string,
  customerId: string | null | undefined,
): Promise<void> {
  if (!customerId) {
    return;
  }
  assertTenantId(companyId);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) {
    throw new Error("Cliente não encontrado");
  }
}
