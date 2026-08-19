/**
 * FASE 3: createSale + SaleItem totals, schema, optional CRM persistence.
 * Usage: npx tsx prisma/verify-crm-sale-items.ts
 *
 * Does not run migrate. Cleans up any rows it creates.
 */
import { PrismaClient } from "@prisma/client";
import { createSaleSchema } from "../src/modules/crm/schemas/crm.schemas";
import {
  SaleTotalsError,
  computeSaleFromItems,
  resolveCreateSaleFinancials,
  splitAmount,
} from "../src/modules/crm/lib/sale-totals";
import {
  cancelSale,
  createSale,
  receiveInstallment,
  updateSale,
} from "../src/modules/crm/services/crm.service";

const prisma = new PrismaClient();
const VERIFY_PREFIX = "__FASE3__";

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const same =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) < 0.001
      : actual === expected;
  if (!same) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertThrows(label: string, fn: () => unknown, match?: string): void {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (match && !message.includes(match)) {
      throw new Error(`${label}: expected message to include "${match}", got "${message}"`);
    }
    return;
  }
  throw new Error(`${label}: expected to throw`);
}

function legacyPayload(overrides?: Record<string, unknown>) {
  return {
    customerId: "cust_1",
    description: "Serviço avulso",
    totalAmount: "150,00",
    paymentMethod: "PIX" as const,
    paymentMode: "CASH" as const,
    cashStatus: "PAID" as const,
    ...overrides,
  };
}

function runUnitTests(): void {
  // TESTE 1 — schema without items (customer sheet)
  const legacy = createSaleSchema.parse(legacyPayload());
  assertEqual(legacy.items, undefined, "TESTE 1 items omitted");
  assertEqual(legacy.totalAmount, 150, "TESTE 1 totalAmount");
  assertEqual(legacy.discountAmount, 0, "TESTE 1 discountAmount");
  assertEqual(legacy.description, "Serviço avulso", "TESTE 1 description");

  const resolvedLegacy = resolveCreateSaleFinancials({
    totalAmount: 150,
    items: undefined,
  });
  assertEqual(resolvedLegacy.items, null, "TESTE 1 resolve items null");
  assertEqual(resolvedLegacy.totalAmount, 150, "TESTE 1 resolve total");
  assertEqual(resolvedLegacy.discountAmount, 0, "TESTE 1 resolve discount");

  // TESTE 2 — 1 item R$ 100; client total ignored
  const t2 = computeSaleFromItems([{ description: "Item A", quantity: 1, unitPrice: 100 }]);
  assertEqual(t2.totalAmount, 100, "TESTE 2 totalAmount");
  assertEqual(t2.items.length, 1, "TESTE 2 item count");
  assertEqual(t2.items[0].lineTotal, 100, "TESTE 2 lineTotal");
  const t2resolved = resolveCreateSaleFinancials({
    totalAmount: 9999,
    items: [{ description: "Item A", quantity: 1, unitPrice: 100, lineTotal: 1, companyId: "outra-empresa" } as never],
  });
  assertEqual(t2resolved.totalAmount, 100, "TESTE 2 ignores client total");
  assertEqual(t2resolved.items?.[0].lineTotal, 100, "TESTE 2 ignores client lineTotal");
  assertEqual(
    Object.prototype.hasOwnProperty.call(t2resolved.items?.[0] ?? {}, "companyId"),
    false,
    "TESTE 9 computed item has no companyId from client",
  );

  const t2schema = createSaleSchema.parse({
    ...legacyPayload({ totalAmount: "9.999,00" }),
    items: [{ description: "Item A", quantity: 1, unitPrice: 100 }],
  });
  assertEqual(t2schema.totalAmount, 100, "TESTE 2 schema ignores client total");

  // TESTE 3 — 2 items: 2×50 + 1×100 = 200
  const t3 = computeSaleFromItems([
    { description: "A", quantity: 2, unitPrice: 50 },
    { description: "B", quantity: 1, unitPrice: 100 },
  ]);
  assertEqual(t3.subtotal, 200, "TESTE 3 subtotal");
  assertEqual(t3.totalAmount, 200, "TESTE 3 total");

  // TESTE 4 — item discount 100 - 20 = 80
  const t4 = computeSaleFromItems([
    { description: "A", quantity: 1, unitPrice: 100, discountAmount: 20 },
  ]);
  assertEqual(t4.items[0].lineTotal, 80, "TESTE 4 lineTotal");
  assertEqual(t4.totalAmount, 80, "TESTE 4 total");

  // TESTE 5 — general discount 200 - 30 = 170
  const t5 = computeSaleFromItems(
    [
      { description: "A", quantity: 2, unitPrice: 50 },
      { description: "B", quantity: 1, unitPrice: 100 },
    ],
    30,
  );
  assertEqual(t5.subtotal, 200, "TESTE 5 subtotal");
  assertEqual(t5.discountAmount, 30, "TESTE 5 discount");
  assertEqual(t5.totalAmount, 170, "TESTE 5 total");

  // TESTE 6 — 1000 in 5x = 200
  const t6parts = splitAmount(1000, 5);
  assertEqual(t6parts.length, 5, "TESTE 6 count");
  t6parts.forEach((part, index) => assertEqual(part, 200, `TESTE 6 installment ${index + 1}`));

  // TESTE 7 — 1000 - 100 = 900 in 5x = 180
  const t7 = computeSaleFromItems([{ description: "Pacote", quantity: 1, unitPrice: 1000 }], 100);
  assertEqual(t7.totalAmount, 900, "TESTE 7 total");
  const t7parts = splitAmount(t7.totalAmount, 5);
  t7parts.forEach((part, index) => assertEqual(part, 180, `TESTE 7 installment ${index + 1}`));

  // TESTE 10 — invalid values
  assertThrows("TESTE 10 qty 0", () => computeSaleFromItems([{ description: "A", quantity: 0, unitPrice: 10 }]), "Quantidade");
  assertThrows("TESTE 10 qty negative", () => computeSaleFromItems([{ description: "A", quantity: -1, unitPrice: 10 }]), "Quantidade");
  assertThrows("TESTE 10 unitPrice negative", () => computeSaleFromItems([{ description: "A", quantity: 1, unitPrice: -10 }]), "Valor unitário");
  assertThrows(
    "TESTE 10 item discount > subtotal",
    () => computeSaleFromItems([{ description: "A", quantity: 1, unitPrice: 100, discountAmount: 120 }]),
    "Desconto do item",
  );
  assertThrows(
    "TESTE 10 general discount > subtotal",
    () => computeSaleFromItems([{ description: "A", quantity: 1, unitPrice: 100 }], 200),
    "Desconto geral",
  );
  assertThrows("TESTE 10 empty description", () => computeSaleFromItems([{ description: "  ", quantity: 1, unitPrice: 10 }]), "descrição");
  assertThrows("TESTE 10 empty items", () => computeSaleFromItems([]), "ao menos um item");
  assertThrows(
    "TESTE 10 empty items resolve",
    () => resolveCreateSaleFinancials({ totalAmount: 100, items: [] }),
    "ao menos um item",
  );

  const emptyItems = createSaleSchema.safeParse(legacyPayload({ items: [] }));
  assertEqual(emptyItems.success, false, "TESTE 10 schema rejects empty items");

  const noDesc = createSaleSchema.safeParse(
    legacyPayload({
      items: [{ description: "", quantity: 1, unitPrice: 10 }],
    }),
  );
  assertEqual(noDesc.success, false, "TESTE 10 schema rejects blank item description");

  try {
    createSaleSchema.parse(legacyPayload({ items: [] }));
    throw new Error("TESTE 10 expected schema to reject empty items");
  } catch (error) {
    if (!(error instanceof SaleTotalsError) && error instanceof Error && error.name === "ZodError") {
      // ok
    } else if (error instanceof Error && error.message.includes("ao menos um item")) {
      // ok
    } else if (error instanceof Error && error.name === "ZodError") {
      // ok
    } else {
      throw error;
    }
  }

  console.log("OK: unit tests TESTE 1-7 + 10 (schema/totals/split)");
}

async function schemaReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "discountAmount" FROM "Sale" LIMIT 0`;
    await prisma.$queryRaw`SELECT "lineTotal" FROM "SaleItem" LIMIT 0`;
    return true;
  } catch {
    return false;
  }
}

async function destroySale(saleId: string): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      installments: { include: { payments: true } },
    },
  });
  if (!sale) return;

  const installmentIds = sale.installments.map((item) => item.id);
  const transactionIds = [
    ...sale.installments.map((item) => item.transactionId),
    ...sale.installments.flatMap((item) => item.payments.map((payment) => payment.transactionId)),
  ].filter((id): id is string => Boolean(id));

  await prisma.sale.delete({ where: { id: saleId } });
  if (transactionIds.length > 0) {
    await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
  }
  await prisma.auditLog.deleteMany({
    where: { entityId: { in: [saleId, ...installmentIds] } },
  });
  await prisma.notification.deleteMany({
    where: {
      companyId: sale.companyId,
      OR: [
        { title: "Nova venda", message: { contains: VERIFY_PREFIX } },
        {
          title: { in: ["Pagamento parcial", "Parcela recebida"] },
          createdAt: { gte: sale.createdAt },
        },
      ],
    },
  });
}

async function countIncomeByDescription(companyId: string, fragment: string): Promise<number> {
  return prisma.transaction.count({
    where: {
      companyId,
      type: "INCOME",
      deletedAt: null,
      description: { contains: fragment },
    },
  });
}

async function expectError(label: string, fn: () => Promise<unknown>, match: string): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(match)) {
      throw new Error(`${label}: expected "${match}", got "${message}"`);
    }
    return;
  }
  throw new Error(`${label}: expected to throw`);
}

async function runPersistenceTests(): Promise<void> {
  const ready = await schemaReady();
  if (!ready) {
    throw new Error("PostgreSQL local não está pronto para SaleItem/discountAmount");
  }

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (companies.length < 2) {
    throw new Error("Seed must create at least 2 companies for tenant tests");
  }
  const [companyA, companyB] = companies;
  const membership = await prisma.membership.findFirst({
    where: { companyId: companyA.id, deletedAt: null },
  });
  const membershipB = await prisma.membership.findFirst({
    where: { companyId: companyB.id, deletedAt: null },
  });
  if (!membership) throw new Error("Demo membership missing");
  if (!membershipB) throw new Error("Second company membership missing");

  const customerA = await prisma.customer.create({
    data: {
      companyId: companyA.id,
      name: `${VERIFY_PREFIX} customer A`,
    },
  });
  const customerB = await prisma.customer.create({
    data: {
      companyId: companyB.id,
      name: `${VERIFY_PREFIX} customer B`,
    },
  });

  const createdSaleIds: string[] = [];
  const saleCountBefore = await prisma.sale.count({
    where: { companyId: companyA.id, deletedAt: null },
  });

  try {
    const t1 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} venda antiga`,
        totalAmount: 150,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PAID",
      },
    });
    createdSaleIds.push(t1.saleId);
    const t1sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t1.saleId },
      include: {
        items: true,
        installments: { include: { payments: true } },
      },
    });
    assertEqual(Number(t1sale.totalAmount), 150, "TESTE 1 DB totalAmount");
    assertEqual(Number(t1sale.discountAmount), 0, "TESTE 1 DB discountAmount");
    assertEqual(t1sale.items.length, 0, "TESTE 1 DB no SaleItem");
    assertEqual(t1sale.installments.length, 1, "TESTE 1 DB installment count");
    assertEqual(t1sale.installments[0].status, "PAID", "TESTE 1 DB installment PAID");
    assertEqual(t1sale.installments[0].payments.length, 1, "à vista paga InstallmentPayment");
    const t1txId = t1sale.installments[0].transactionId;
    if (!t1txId) throw new Error("à vista paga missing Transaction");
    assertEqual(t1sale.installments[0].payments[0].transactionId, t1txId, "à vista paga same Transaction");
    const t1tx = await prisma.transaction.findUniqueOrThrow({ where: { id: t1txId } });
    assertEqual(t1tx.type, "INCOME", "à vista paga Transaction type");
    assertEqual(t1tx.status, "PAID", "à vista paga Transaction status");
    assertEqual(Number(t1tx.amount), 150, "à vista paga Transaction amount");
    assertEqual(await countIncomeByDescription(companyA.id, `${VERIFY_PREFIX} venda antiga`), 1, "à vista paga no duplicate Transaction");
    console.log("PASS: Venda antiga");
    console.log("PASS: À vista paga");

    const t2 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} 1 item`,
        totalAmount: 9999,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PENDING",
        items: [{ description: "Item A", quantity: 1, unitPrice: 100 }],
      },
    });
    createdSaleIds.push(t2.saleId);
    const t2sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t2.saleId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        installments: { include: { payments: true } },
      },
    });
    assertEqual(Number(t2sale.totalAmount), 100, "TESTE 2 DB totalAmount");
    assertEqual(t2sale.items.length, 1, "TESTE 2 DB item count");
    assertEqual(Number(t2sale.items[0].lineTotal), 100, "TESTE 2 DB lineTotal");
    assertEqual(t2sale.items[0].companyId, companyA.id, "TESTE 2 DB item companyId");
    assertEqual(t2sale.installments.length, 1, "à vista pendente installment count");
    assertEqual(t2sale.installments[0].status, "PENDING", "à vista pendente status");
    assertEqual(t2sale.installments[0].payments.length, 0, "à vista pendente no InstallmentPayment");
    const t2txId = t2sale.installments[0].transactionId;
    if (!t2txId) throw new Error("à vista pendente missing Transaction");
    const t2tx = await prisma.transaction.findUniqueOrThrow({ where: { id: t2txId } });
    assertEqual(t2tx.status, "PENDING", "à vista pendente Transaction status");
    assertEqual(t2tx.type, "INCOME", "à vista pendente Transaction type");
    console.log("PASS: 1 item");
    console.log("PASS: À vista pendente");

    const t3 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} 2 itens`,
        totalAmount: 1,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PENDING",
        items: [
          { description: "A", quantity: 2, unitPrice: 50 },
          { description: "B", quantity: 1, unitPrice: 100 },
        ],
      },
    });
    createdSaleIds.push(t3.saleId);
    const t3sale = await prisma.sale.findUniqueOrThrow({ where: { id: t3.saleId } });
    assertEqual(Number(t3sale.totalAmount), 200, "TESTE 3 DB totalAmount");
    console.log("PASS: Múltiplos itens");

    const t4 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} desc item`,
        totalAmount: 100,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PENDING",
        items: [{ description: "A", quantity: 1, unitPrice: 100, discountAmount: 20 }],
      },
    });
    createdSaleIds.push(t4.saleId);
    const t4sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t4.saleId },
      include: { items: true },
    });
    assertEqual(Number(t4sale.items[0].lineTotal), 80, "TESTE 4 DB lineTotal");
    console.log("PASS: Desconto item");

    const t5 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} desc 700`,
        totalAmount: 9999,
        discountAmount: 30,
        paymentMethod: "PIX",
        paymentMode: "CASH",
        cashStatus: "PENDING",
        items: [
          { description: "Item 1", quantity: 1, unitPrice: 500, discountAmount: 50 },
          { description: "Item 2", quantity: 1, unitPrice: 300, discountAmount: 20 },
        ],
      },
    });
    createdSaleIds.push(t5.saleId);
    const t5sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t5.saleId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    assertEqual(Number(t5sale.totalAmount), 700, "TESTE 5 DB totalAmount 700");
    assertEqual(Number(t5sale.discountAmount), 30, "TESTE 5 DB discountAmount 30");
    assertEqual(Number(t5sale.items[0].lineTotal), 450, "TESTE 5 DB line 450");
    assertEqual(Number(t5sale.items[1].lineTotal), 280, "TESTE 5 DB line 280");
    console.log("PASS: Desconto geral");

    const t6 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} 5x 1000`,
        totalAmount: 1000,
        paymentMethod: "PIX",
        paymentMode: "INSTALLMENT",
        installmentsCount: 5,
        firstDueDate: "2099-01-15",
        period: "MONTHLY",
        items: [{ description: "Pacote", quantity: 1, unitPrice: 1000 }],
      },
    });
    createdSaleIds.push(t6.saleId);
    const t6sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t6.saleId },
      include: {
        installments: { orderBy: { number: "asc" }, include: { payments: true } },
      },
    });
    assertEqual(t6sale.installments.length, 5, "TESTE 6 DB installment count");
    const t6paid = t6sale.installments.reduce(
      (acc, item) => acc + item.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      0,
    );
    assertEqual(t6paid, 0, "TESTE 6 DB received 0");
    t6sale.installments.forEach((item, index) => {
      assertEqual(Number(item.amount), 200, `TESTE 6 DB installment ${index + 1}`);
      assertEqual(item.transactionId, null, `TESTE 6 DB no advance Transaction ${index + 1}`);
    });
    assertEqual(await countIncomeByDescription(companyA.id, `${VERIFY_PREFIX} 5x 1000`), 0, "TESTE 6 no paid Transaction");
    console.log("PASS: Parcelado");

    const t7 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} 5x 900`,
        totalAmount: 1000,
        discountAmount: 100,
        paymentMethod: "PIX",
        paymentMode: "INSTALLMENT",
        installmentsCount: 5,
        firstDueDate: "2099-01-15",
        period: "MONTHLY",
        items: [{ description: "Pacote", quantity: 1, unitPrice: 1000 }],
      },
    });
    createdSaleIds.push(t7.saleId);
    const t7sale = await prisma.sale.findUniqueOrThrow({
      where: { id: t7.saleId },
      include: { installments: { orderBy: { number: "asc" } } },
    });
    assertEqual(Number(t7sale.totalAmount), 900, "TESTE 7 DB totalAmount");
    t7sale.installments.forEach((item, index) => {
      assertEqual(Number(item.amount), 180, `TESTE 7 DB installment ${index + 1}`);
    });
    console.log("PASS: Parcelado com desconto");

    const t8 = await createSale({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        customerId: customerA.id,
        description: `${VERIFY_PREFIX} parcial 200`,
        totalAmount: 200,
        paymentMethod: "PIX",
        paymentMode: "INSTALLMENT",
        installmentsCount: 1,
        firstDueDate: "2099-01-15",
        period: "MONTHLY",
      },
    });
    createdSaleIds.push(t8.saleId);
    const t8before = await prisma.sale.findUniqueOrThrow({
      where: { id: t8.saleId },
      include: { installments: true },
    });
    assertEqual(t8before.installments.length, 1, "TESTE 8 one installment");
    assertEqual(Number(t8before.installments[0].amount), 200, "TESTE 8 created amount 200");
    assertEqual(t8before.installments[0].transactionId, null, "TESTE 8 no advance Transaction");
    const installmentCountBefore = t8before.installments.length;
    const received = await receiveInstallment({
      companyId: companyA.id,
      userId: membership.userId,
      data: {
        installmentId: t8before.installments[0].id,
        amount: 100,
        paidAt: new Date().toISOString(),
        paymentMethod: "PIX",
      },
    });
    assertEqual(received.fullyPaid, false, "TESTE 8 not fully paid");
    assertEqual(received.amountRemaining, 100, "TESTE 8 remaining 100");
    const t8after = await prisma.installment.findUniqueOrThrow({
      where: { id: t8before.installments[0].id },
      include: { payments: true },
    });
    const amountPaid = t8after.payments.reduce((acc, payment) => acc + Number(payment.amount), 0);
    assertEqual(Number(t8after.amount), 200, "TESTE 8 amount 200");
    assertEqual(amountPaid, 100, "TESTE 8 amountPaid 100");
    assertEqual(received.amountRemaining, 100, "TESTE 8 remaining");
    assertEqual(t8after.status, "PENDING", "TESTE 8 still open");
    assertEqual(t8after.payments.length, 1, "TESTE 8 one InstallmentPayment");
    const paymentTxId = t8after.payments[0].transactionId;
    if (!paymentTxId) throw new Error("TESTE 8 missing payment Transaction");
    const paymentTx = await prisma.transaction.findUniqueOrThrow({ where: { id: paymentTxId } });
    assertEqual(paymentTx.type, "INCOME", "TESTE 8 Transaction type");
    assertEqual(paymentTx.status, "PAID", "TESTE 8 Transaction PAID");
    assertEqual(Number(paymentTx.amount), 100, "TESTE 8 Transaction 100");
    assertEqual(await countIncomeByDescription(companyA.id, `${VERIFY_PREFIX} parcial 200`), 1, "TESTE 8 one Transaction");
    const t8saleAfter = await prisma.sale.findUniqueOrThrow({
      where: { id: t8.saleId },
      include: { installments: true },
    });
    assertEqual(t8saleAfter.installments.length, installmentCountBefore, "TESTE 8 no extra installment");
    const saleCountAfterPartial = await prisma.sale.count({
      where: { companyId: companyA.id, description: `${VERIFY_PREFIX} parcial 200` },
    });
    assertEqual(saleCountAfterPartial, 1, "TESTE 8 no extra Sale");
    console.log("PASS: Parcial");

    await expectError(
      "TESTE 9 createSale other tenant customer",
      () =>
        createSale({
          companyId: companyA.id,
          userId: membership.userId,
          data: {
            customerId: customerB.id,
            description: `${VERIFY_PREFIX} cross tenant`,
            totalAmount: 10,
            paymentMethod: "PIX",
            paymentMode: "CASH",
            cashStatus: "PENDING",
          },
        }),
      "Cliente não encontrado",
    );

    const leakedSale = await prisma.sale.findFirst({
      where: { id: t1.saleId, companyId: companyB.id, deletedAt: null },
    });
    assertEqual(leakedSale, null, "TESTE 9 consult sale blocked");
    const leakedItems = await prisma.saleItem.findMany({
      where: { saleId: t2.saleId, companyId: companyB.id },
    });
    assertEqual(leakedItems.length, 0, "TESTE 9 SaleItem not visible as company B");
    assertEqual(t2sale.items[0].companyId, companyA.id, "TESTE 9 SaleItem uses session companyId");

    await expectError(
      "TESTE 9 updateSale",
      () =>
        updateSale({
          companyId: companyB.id,
          userId: membershipB.userId,
          data: {
            id: t1.saleId,
            description: "hack",
            totalAmount: 1,
            paymentMethod: "PIX",
            soldAt: new Date().toISOString(),
          },
        }),
      "Venda não encontrada",
    );
    await expectError(
      "TESTE 9 cancelSale",
      () =>
        cancelSale({
          companyId: companyB.id,
          userId: membershipB.userId,
          saleId: t6.saleId,
        }),
      "Venda não encontrada",
    );
    await expectError(
      "TESTE 9 receiveInstallment",
      () =>
        receiveInstallment({
          companyId: companyB.id,
          userId: membershipB.userId,
          data: {
            installmentId: t6sale.installments[0].id,
            amount: 10,
            paidAt: new Date().toISOString(),
            paymentMethod: "PIX",
          },
        }),
      "Parcela não encontrada",
    );
    const t6untouched = await prisma.installment.findUniqueOrThrow({
      where: { id: t6sale.installments[0].id },
      include: { payments: true },
    });
    assertEqual(t6untouched.payments.length, 0, "TESTE 9 installment not received by B");
    console.log("PASS: Multi-tenant");

    const beforeCount = await prisma.sale.count({
      where: { companyId: companyA.id, description: `${VERIFY_PREFIX} invalida` },
    });
    await expectError(
      "TESTE 10 invalid items",
      () =>
        createSale({
          companyId: companyA.id,
          userId: membership.userId,
          data: {
            customerId: customerA.id,
            description: `${VERIFY_PREFIX} invalida`,
            totalAmount: 100,
            paymentMethod: "PIX",
            paymentMode: "CASH",
            cashStatus: "PENDING",
            items: [{ description: "A", quantity: 1, unitPrice: 100, discountAmount: 500 }],
          },
        }),
      "Desconto do item",
    );
    const afterCount = await prisma.sale.count({
      where: { companyId: companyA.id, description: `${VERIFY_PREFIX} invalida` },
    });
    assertEqual(afterCount, beforeCount, "TESTE 10 no partial Sale");
    console.log("PASS: Valores inválidos");

    const leftover = await prisma.sale.count({
      where: { companyId: companyA.id, deletedAt: null },
    });
    assertEqual(leftover, saleCountBefore + createdSaleIds.length, "only test sales added before cleanup");

    console.log("OK: persistence tests TESTE 1-10");
  } finally {
    for (const saleId of createdSaleIds.reverse()) {
      await destroySale(saleId);
    }
    await prisma.customer.deleteMany({
      where: { id: { in: [customerA.id, customerB.id] } },
    });
  }
}

async function main() {
  runUnitTests();
  await runPersistenceTests();
  const leftover = await prisma.sale.count({
    where: { description: { contains: VERIFY_PREFIX } },
  });
  const leftoverCustomers = await prisma.customer.count({
    where: { name: { contains: VERIFY_PREFIX } },
  });
  if (leftover !== 0 || leftoverCustomers !== 0) {
    throw new Error(`Cleanup incomplete: sales=${leftover} customers=${leftoverCustomers}`);
  }
  console.log("OK: test rows removed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
