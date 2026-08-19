/**
 * FASE 5: Nova Venda payload + createSale motor + RBAC.
 * Usage: npx tsx prisma/verify-sales-new.ts
 */
import { PrismaClient } from "@prisma/client";
import { createSaleSchema } from "../src/modules/crm/schemas/crm.schemas";
import { createSale } from "../src/modules/crm/services/crm.service";
import { hasPermission } from "../src/shared/lib/rbac";

const prisma = new PrismaClient();
const PREFIX = "__FASE5__";

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const same =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) < 0.001
      : actual === expected;
  if (!same) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function formPayload(overrides: Record<string, unknown>) {
  return {
    customerId: "cust",
    description: "Venda",
    totalAmount: "0,01",
    paymentMethod: "PIX" as const,
    paymentMode: "CASH" as const,
    cashStatus: "PAID" as const,
    ...overrides,
  };
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
  assertEqual(hasPermission("ADMIN", "sales:manage"), true, "ADMIN can manage");
  assertEqual(hasPermission("MANAGER", "sales:manage"), true, "MANAGER can manage");
  assertEqual(hasPermission("EMPLOYEE", "sales:manage"), false, "EMPLOYEE blocked");
  console.log("PASS: TESTE 8 RBAC sales:manage");

  const parsed = createSaleSchema.parse(
    formPayload({
      items: [{ description: "Item A", quantity: "1", unitPrice: "100", discountAmount: "0" }],
      discountAmount: "0",
      totalAmount: "999",
    }),
  );
  assertEqual(parsed.totalAmount, 100, "schema ignores client total");
  assertEqual(parsed.items?.length, 1, "items forwarded");

  const discounted = createSaleSchema.parse(
    formPayload({
      items: [
        { description: "A", quantity: "2", unitPrice: "50" },
        { description: "B", quantity: "1", unitPrice: "100" },
      ],
      discountAmount: "30",
    }),
  );
  assertEqual(discounted.totalAmount, 170, "TESTE 4 schema total 170");

  const installment = createSaleSchema.parse(
    formPayload({
      paymentMode: "INSTALLMENT",
      cashStatus: undefined,
      installmentsCount: "5",
      firstDueDate: "2099-01-15",
      period: "MONTHLY",
      items: [{ description: "Pacote", quantity: "1", unitPrice: "1000" }],
      discountAmount: "100",
    }),
  );
  assertEqual(installment.totalAmount, 900, "TESTE 6 schema total 900");
  assertEqual(installment.installmentsCount, 5, "TESTE 6 count");

  const invalid = createSaleSchema.safeParse(
    formPayload({
      items: [{ description: "A", quantity: "1", unitPrice: "100", discountAmount: "500" }],
    }),
  );
  assertEqual(invalid.success, false, "TESTE 10 schema rejects over-discount");
  console.log("PASS: form payload schema");

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
    data: { companyId: companyA.id, name: `${PREFIX} Maria` },
  });
  const customerB = await prisma.customer.create({
    data: { companyId: companyB.id, name: `${PREFIX} Outro tenant` },
  });
  const saleIds: string[] = [];

  try {
    const t1 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: createSaleSchema.parse(
        formPayload({
          customerId: customerA.id,
          description: `${PREFIX} 1 item`,
          items: [{ description: "Item", quantity: "1", unitPrice: "100" }],
        }),
      ),
    });
    saleIds.push(t1.saleId);
    const t1sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t1.saleId },
      include: { items: true, installments: { include: { payments: true } } },
    });
    assertEqual(t1sale.items.length, 1, "TESTE 1 SaleItem");
    assertEqual(t1sale.installments[0].status, "PAID", "TESTE 1 PAID");
    assertEqual(t1sale.installments[0].payments.length, 1, "TESTE 1 payment");
    if (!t1sale.installments[0].transactionId) throw new Error("TESTE 1 missing Transaction");
    console.log("PASS: TESTE 1 à vista paga");

    const t2 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: createSaleSchema.parse(
        formPayload({
          customerId: customerA.id,
          description: `${PREFIX} 2 itens`,
          cashStatus: "PENDING",
          items: [
            { description: "A", quantity: "2", unitPrice: "50" },
            { description: "B", quantity: "1", unitPrice: "100" },
          ],
        }),
      ),
    });
    saleIds.push(t2.saleId);
    const t2sale = await prisma.sale.findUniqueOrThrow({ where: { id: t2.saleId } });
    assertEqual(Number(t2sale.totalAmount), 200, "TESTE 2 total 200");
    console.log("PASS: TESTE 2");

    const t3 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: createSaleSchema.parse(
        formPayload({
          customerId: customerA.id,
          description: `${PREFIX} desc item`,
          cashStatus: "PENDING",
          items: [{ description: "A", quantity: "1", unitPrice: "100", discountAmount: "20" }],
        }),
      ),
    });
    saleIds.push(t3.saleId);
    const t3sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t3.saleId },
      include: { items: true },
    });
    assertEqual(Number(t3sale.items[0].lineTotal), 80, "TESTE 3 line 80");
    console.log("PASS: TESTE 3");

    const t4 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: createSaleSchema.parse(
        formPayload({
          customerId: customerA.id,
          description: `${PREFIX} desc geral`,
          cashStatus: "PENDING",
          discountAmount: "30",
          items: [
            { description: "A", quantity: "2", unitPrice: "50" },
            { description: "B", quantity: "1", unitPrice: "100" },
          ],
        }),
      ),
    });
    saleIds.push(t4.saleId);
    const t4sale = await prisma.sale.findUniqueOrThrow({ where: { id: t4.saleId } });
    assertEqual(Number(t4sale.totalAmount), 170, "TESTE 4 total 170");
    console.log("PASS: TESTE 4");

    const t5 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: createSaleSchema.parse(
        formPayload({
          customerId: customerA.id,
          description: `${PREFIX} 5x`,
          paymentMode: "INSTALLMENT",
          installmentsCount: "5",
          firstDueDate: "2099-01-15",
          period: "MONTHLY",
          items: [{ description: "Pacote", quantity: "1", unitPrice: "1000" }],
        }),
      ),
    });
    saleIds.push(t5.saleId);
    const t5sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t5.saleId },
      include: { installments: true },
    });
    assertEqual(t5sale.installments.length, 5, "TESTE 5 count");
    t5sale.installments.forEach((item) => assertEqual(Number(item.amount), 200, "TESTE 5 200"));
    console.log("PASS: TESTE 5");

    const t6 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: createSaleSchema.parse(
        formPayload({
          customerId: customerA.id,
          description: `${PREFIX} 5x 900`,
          paymentMode: "INSTALLMENT",
          installmentsCount: "5",
          firstDueDate: "2099-01-15",
          period: "MONTHLY",
          discountAmount: "100",
          items: [{ description: "Pacote", quantity: "1", unitPrice: "1000" }],
        }),
      ),
    });
    saleIds.push(t6.saleId);
    const t6sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t6.saleId },
      include: { installments: true },
    });
    t6sale.installments.forEach((item) => assertEqual(Number(item.amount), 180, "TESTE 6 180"));
    console.log("PASS: TESTE 6");

    try {
      await createSale({
        companyId: companyA.id,
        userId: membership.userId,
        data: createSaleSchema.parse(
          formPayload({
            customerId: customerB.id,
            description: `${PREFIX} cross`,
            items: [{ description: "X", quantity: "1", unitPrice: "10" }],
          }),
        ),
      });
      throw new Error("TESTE 7 should reject other tenant");
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "Cliente não encontrado") throw error;
    }
    console.log("PASS: TESTE 7 tenant");

    const beforeInvalid = await prisma.sale.count({
      where: { description: `${PREFIX} invalida` },
    });
    const parsedInvalid = createSaleSchema.safeParse(
      formPayload({
        customerId: customerA.id,
        description: `${PREFIX} invalida`,
        items: [{ description: "A", quantity: "0", unitPrice: "100" }],
      }),
    );
    assertEqual(parsedInvalid.success, false, "TESTE 10 invalid qty");
    const afterInvalid = await prisma.sale.count({
      where: { description: `${PREFIX} invalida` },
    });
    assertEqual(afterInvalid, beforeInvalid, "TESTE 10 no sale");
    console.log("PASS: TESTE 10");
  } finally {
    for (const id of saleIds.reverse()) await destroySale(id);
    await prisma.customer.deleteMany({ where: { id: { in: [customerA.id, customerB.id] } } });
  }

  console.log("OK: FASE 5 Nova Venda verification");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
