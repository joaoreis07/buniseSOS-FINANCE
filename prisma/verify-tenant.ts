/**
 * Stage 2 validation script:
 * - tenant isolation
 * - soft delete filtering
 */
import { PrismaCustomerRepository } from "../src/modules/customers/repositories/prisma-customer.repository";
import { prisma } from "../src/shared/lib/prisma";

async function main() {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (companies.length < 2) {
    throw new Error("Seed must create at least 2 companies for isolation checks");
  }

  const [companyA, companyB] = companies;
  const customerRepo = new PrismaCustomerRepository();

  const listA = await customerRepo.list(companyA.id);
  const listB = await customerRepo.list(companyB.id);

  const leakedFromA = listA.items.some((item) => item.companyId !== companyA.id);
  const leakedFromB = listB.items.some((item) => item.companyId !== companyB.id);

  if (leakedFromA || leakedFromB) {
    throw new Error("Tenant isolation failed: customer list leaked across companies");
  }

  if (listA.items.length === 0) {
    throw new Error("Expected seeded customers for company A");
  }

  const target = listA.items[0];
  await customerRepo.softDelete(companyA.id, target.id);

  const afterDelete = await customerRepo.findById(companyA.id, target.id);
  if (afterDelete !== null) {
    throw new Error("Soft delete failed: deleted customer still returned by findById");
  }

  const listedAfterDelete = await customerRepo.list(companyA.id);
  if (listedAfterDelete.items.some((item) => item.id === target.id)) {
    throw new Error("Soft delete failed: deleted customer still listed");
  }

  // restore for demo usability
  await prisma.customer.update({
    where: { id: target.id },
    data: { deletedAt: null },
  });

  // Cross-tenant access attempt
  const cross = await customerRepo.findById(companyB.id, target.id);
  if (cross !== null) {
    throw new Error("Tenant isolation failed: company B can read company A customer");
  }

  console.log("Tenant isolation OK");
  console.log("Soft delete filtering OK");
  console.log(`Company A customers: ${listA.total}`);
  console.log(`Company B customers: ${listB.total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
