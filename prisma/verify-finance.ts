/**
 * Stage 7 validation: finance transactions, categories, cash flow, tenant isolation, audit.
 * Usage: npx tsx prisma/verify-finance.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  createFinanceCategory,
  createFinanceTransaction,
  deleteFinanceCategory,
  deleteFinanceTransaction,
  getCashFlowSummary,
} from "../src/modules/finance/services/finance.service";
import { PrismaTransactionRepository } from "../src/modules/finance/repositories/prisma-finance.repository";

const prisma = new PrismaClient();
const transactions = new PrismaTransactionRepository();

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

  const membership = await prisma.membership.findFirst({
    where: { companyId: companyA.id, deletedAt: null },
  });
  if (!membership) {
    throw new Error("Demo membership missing");
  }

  const category = await createFinanceCategory({
    companyId: companyA.id,
    userId: membership.userId,
    data: {
      name: `Verify Cat ${Date.now()}`,
      type: "INCOME",
    },
  });

  const created = await createFinanceTransaction({
    companyId: companyA.id,
    userId: membership.userId,
    data: {
      type: "INCOME",
      status: "PAID",
      paymentMethod: "PIX",
      amount: 99.9,
      description: "Verify Stage7 income",
      date: new Date(),
      paidAt: new Date(),
      categoryId: category.id,
    },
  });

  const listed = await transactions.list(companyA.id, {
    search: "Verify Stage7",
  });
  if (!listed.items.some((item) => item.id === created.id)) {
    throw new Error("Created transaction missing from list");
  }

  const leaked = await transactions.findById(companyB.id, created.id);
  if (leaked) {
    throw new Error("Tenant isolation failed for transactions");
  }

  const cashFlow = await getCashFlowSummary(companyA.id);
  if (typeof cashFlow.balance !== "number" || cashFlow.transactionCount < 1) {
    throw new Error("Cash flow summary invalid");
  }
  if (Math.abs(cashFlow.incomePaid - cashFlow.expensePaid - cashFlow.balance) > 0.001) {
    throw new Error("Cash flow balance inconsistent");
  }

  const auditCount = await prisma.auditLog.count({
    where: {
      companyId: companyA.id,
      module: "finance",
      entityId: { in: [created.id, category.id] },
    },
  });
  if (auditCount < 2) {
    throw new Error("Expected audit logs for finance mutations");
  }

  await deleteFinanceTransaction({
    companyId: companyA.id,
    userId: membership.userId,
    id: created.id,
  });
  const afterDelete = await transactions.findById(companyA.id, created.id);
  if (afterDelete) {
    throw new Error("Soft delete failed for transaction");
  }

  await deleteFinanceCategory({
    companyId: companyA.id,
    userId: membership.userId,
    id: category.id,
  });

  console.log("OK: finance CRUD + cash flow + tenant isolation + audit", {
    cashFlowBalance: cashFlow.balance,
    auditCount,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
