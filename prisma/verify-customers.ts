/**
 * Stage 6 validation: customer CRUD + tenant isolation + financial history.
 * Usage: npx tsx prisma/verify-customers.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaCustomerRepository } from "../src/modules/customers/repositories/prisma-customer.repository";

const prisma = new PrismaClient();
const repo = new PrismaCustomerRepository();

async function main() {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (companies.length < 2) {
    throw new Error("Seed must create at least 2 companies");
  }

  const [companyA, companyB] = companies;

  const created = await repo.create(companyA.id, {
    name: "Cliente Verify Stage6",
    email: `verify-stage6-${Date.now()}@example.com`,
    phone: "(11) 90000-0000",
    city: "São Paulo",
    state: "SP",
    status: "ACTIVE",
  });

  const listedA = await repo.list(companyA.id, { search: "Cliente Verify Stage6" });
  if (!listedA.items.some((item) => item.id === created.id)) {
    throw new Error("Created customer not found in company A list");
  }

  const leaked = await repo.findById(companyB.id, created.id);
  if (leaked) {
    throw new Error("Tenant isolation failed: company B can read company A customer");
  }

  const updated = await repo.update(companyA.id, created.id, {
    notes: "Atualizado no verify",
    status: "INACTIVE",
  });
  if (updated.notes !== "Atualizado no verify" || updated.status !== "INACTIVE") {
    throw new Error("Customer update failed");
  }

  const detail = await repo.getDetail(companyA.id, created.id);
  if (!detail) {
    throw new Error("Customer detail missing");
  }
  if (!Array.isArray(detail.history) || typeof detail.summary.balance !== "number") {
    throw new Error("Customer financial history shape invalid");
  }

  // Seeded customer with transactions should expose history
  const seeded = await prisma.customer.findFirst({
    where: {
      companyId: companyA.id,
      deletedAt: null,
      name: "Renata Costa",
    },
  });
  if (seeded) {
    const seededDetail = await repo.getDetail(companyA.id, seeded.id);
    if (!seededDetail || seededDetail.history.length < 1) {
      throw new Error("Expected financial history for Renata Costa");
    }
  }

  await repo.softDelete(companyA.id, created.id);
  const afterDelete = await repo.findById(companyA.id, created.id);
  if (afterDelete) {
    throw new Error("Soft delete failed: customer still returned by findById");
  }

  console.log("OK: customers CRUD + tenant isolation + history");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
