/**
 * FASE 4: listSales tenant isolation, old sales, indicators.
 * Usage: npx tsx prisma/verify-sales-list.ts
 */
import { PrismaClient } from "@prisma/client";
import { hasPermission } from "../src/shared/lib/rbac";
import { createSale } from "../src/modules/crm/services/crm.service";
import { listSales } from "../src/modules/sales/services/sales.service";

const prisma = new PrismaClient();
const PREFIX = "__FASE4__";

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const same =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) < 0.001
      : actual === expected;
  if (!same) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function destroySale(saleId: string): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { installments: { include: { payments: true } } },
  });
  if (!sale) return;
  const transactionIds = [
    ...sale.installments.map((item) => item.transactionId),
    ...sale.installments.flatMap((item) => item.payments.map((payment) => payment.transactionId)),
  ].filter((id): id is string => Boolean(id));
  await prisma.sale.delete({ where: { id: saleId } });
  if (transactionIds.length > 0) {
    await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
  }
  await prisma.auditLog.deleteMany({ where: { entityId: saleId } });
  await prisma.notification.deleteMany({
    where: { title: "Nova venda", message: { contains: PREFIX } },
  });
}

async function main() {
  assertEqual(hasPermission("ADMIN", "sales:view"), true, "ADMIN sales:view");
  assertEqual(hasPermission("MANAGER", "sales:view"), true, "MANAGER sales:view");
  assertEqual(hasPermission("EMPLOYEE", "sales:view"), false, "EMPLOYEE blocked");
  console.log("PASS: RBAC sales:view");

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (companies.length < 2) throw new Error("Need 2 companies");
  const [companyA, companyB] = companies;
  const membership = await prisma.membership.findFirst({
    where: { companyId: companyA.id, deletedAt: null },
  });
  if (!membership) throw new Error("Membership missing");

  const customerA = await prisma.customer.create({
    data: { companyId: companyA.id, name: `${PREFIX} cliente A` },
  });
  const customerB = await prisma.customer.create({
    data: { companyId: companyB.id, name: `${PREFIX} cliente B` },
  });
  const saleIds: string[] = [];

  try {
    const oldSale = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${PREFIX} antiga`,
        totalAmount: 150,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PAID",
      },
    });
    saleIds.push(oldSale.saleId);

    const withItems = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${PREFIX} com item`,
        totalAmount: 80,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PENDING",
        items: [{ description: "Serviço", quantity: 1, unitPrice: 80 }],
      },
    });
    saleIds.push(withItems.saleId);

    const other = await createSale({
      companyId: companyB.id,
      userId: membership.userId,
      data: {
        customerId: customerB.id,
        description: `${PREFIX} outra empresa`,
        totalAmount: 999,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PENDING",
      },
    });
    saleIds.push(other.saleId);

    const listedA = await listSales({
      companyId: companyA.id,
      filters: { period: "todos", search: PREFIX, page: 1, pageSize: 20 },
    });
    const idsA = listedA.items.map((item) => item.id);
    if (!idsA.includes(oldSale.saleId)) throw new Error("Old sale missing from company A list");
    if (!idsA.includes(withItems.saleId)) throw new Error("Item sale missing from company A list");
    if (idsA.includes(other.saleId)) throw new Error("Company B sale leaked into company A");

    const oldRow = listedA.items.find((item) => item.id === oldSale.saleId);
    if (!oldRow) throw new Error("Old sale row missing");
    assertEqual(oldRow.itemCount, 0, "legacy sale has 0 items");
    assertEqual(oldRow.customerName, `${PREFIX} cliente A`, "customer name");
    assertEqual(oldRow.totalAmount, 150, "legacy total");
    assertEqual(oldRow.status, "PAID", "legacy cash paid status");

    const itemRow = listedA.items.find((item) => item.id === withItems.saleId);
    if (!itemRow) throw new Error("Item sale row missing");
    assertEqual(itemRow.itemCount, 1, "sale with item count");
    assertEqual(itemRow.status, "PENDING", "pending status");

    const leaked = await listSales({
      companyId: companyB.id,
      filters: { period: "todos", search: `${PREFIX} antiga`, page: 1, pageSize: 20 },
    });
    if (leaked.items.some((item) => item.id === oldSale.saleId)) {
      throw new Error("Company B saw company A sale by search");
    }

    const indicators = await listSales({
      companyId: companyA.id,
      filters: { period: "todos" },
    });
    if (indicators.indicators.salesCount < 2) {
      throw new Error("Indicators did not count company A sales");
    }

    const searchByName = await listSales({
      companyId: companyA.id,
      filters: { period: "todos", search: `${PREFIX} cliente A` },
    });
    if (searchByName.items.length < 2) throw new Error("Search by customer name failed");

    const searchByCode = await listSales({
      companyId: companyA.id,
      filters: { period: "todos", search: `#${oldRow.code}` },
    });
    if (!searchByCode.items.some((item) => item.id === oldSale.saleId)) {
      throw new Error("Search by sale code failed");
    }

    console.log("PASS: listSales tenant, legacy sale, search, indicators");
  } finally {
    for (const id of saleIds.reverse()) {
      await destroySale(id);
    }
    await prisma.customer.deleteMany({
      where: { id: { in: [customerA.id, customerB.id] } },
    });
  }

  const leftover = await prisma.sale.count({ where: { description: { contains: PREFIX } } });
  if (leftover !== 0) throw new Error(`Cleanup incomplete: ${leftover}`);
  console.log("OK: FASE 4 listSales verification");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
