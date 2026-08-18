import { revalidateTag } from "next/cache";
import { addDays, addWeeks, addMonths, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { getDashboardCacheTag } from "@/modules/dashboard/services/dashboard.service";
import { getFinanceCacheTag } from "@/modules/finance/services/finance.service";
import { getCustomersCacheTag } from "@/modules/customers/services/customer.service";
import { prisma } from "@/shared/lib/prisma";
import { assertCategoryBelongsToTenant } from "@/shared/lib/tenant-fk";
import { assertTenantId } from "@/shared/lib/tenant";
import { dueCivilDateKey, todayCivilDateKey } from "../lib/civil-date";
import {
  buildCustomerInstallmentsBoard,
  computeFinancialStatus,
  money,
  type CreateSaleInput,
  type CustomerCrmSummaryDTO,
  type CustomerListCrmItemDTO,
  type InstallmentDTO,
  type InstallmentPaymentHistoryDTO,
  type ReceiveInstallmentInput,
  type ReceivablesOverviewDTO,
  type SaleDTO,
  type TimelineItemDTO,
  type UpdateInstallmentInput,
  type UpdateSaleInput,
} from "../dto/crm.dto";

function invalidateCrmCaches(companyId: string): void {
  try {
    revalidateTag(getFinanceCacheTag(companyId));
    revalidateTag(getDashboardCacheTag(companyId));
    revalidateTag(`reports:${companyId}`);
    revalidateTag(getCustomersCacheTag(companyId));
  } catch {
    // outside request context
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sumPaymentAmounts(payments?: Array<{ amount: unknown }> | null): number {
  if (!payments?.length) return 0;
  return roundMoney(payments.reduce((acc, payment) => acc + Number(payment.amount), 0));
}

function toInstallmentDto(item: {
  id: string;
  saleId: string;
  number: number;
  amount: unknown;
  dueDate: Date;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt: Date | null;
  paymentMethod: string | null;
  notes: string | null;
  sale: { description: string; customerId: string; customer: { name: string } };
  payments?: Array<{ amount: unknown }> | null;
}): InstallmentDTO {
  const amount = roundMoney(Number(item.amount));
  const amountPaid = sumPaymentAmounts(item.payments);
  // Legacy fully-paid installments without payment rows
  const effectivePaid =
    amountPaid > 0
      ? amountPaid
      : item.status === "PAID"
        ? amount
        : 0;
  const amountRemaining = roundMoney(Math.max(0, amount - effectivePaid));
  const isPartial = effectivePaid > 0 && amountRemaining > 0;

  let status = item.status;
  const dueKey = dueCivilDateKey(item.dueDate);
  const todayKey = todayCivilDateKey();
  if (amountRemaining <= 0) {
    status = "PAID";
  } else if (status === "PAID") {
    status = dueKey < todayKey ? "OVERDUE" : "PENDING";
  } else if (status !== "CANCELED" && dueKey < todayKey) {
    status = "OVERDUE";
  }

  return {
    id: item.id,
    saleId: item.saleId,
    saleDescription: item.sale.description,
    customerId: item.sale.customerId,
    customerName: item.sale.customer.name,
    number: item.number,
    amount,
    amountPaid: effectivePaid,
    amountRemaining,
    formattedAmount: money(amount).formatted,
    formattedAmountPaid: money(effectivePaid).formatted,
    formattedAmountRemaining: money(amountRemaining).formatted,
    dueDate: item.dueDate.toISOString(),
    status,
    isPartial,
    paidAt: item.paidAt?.toISOString() ?? null,
    paymentMethod: item.paymentMethod,
    notes: item.notes,
  };
}

function buildDueDates(params: {
  count: number;
  firstDueDate: Date;
  period: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";
  customPeriodDays?: number;
}): Date[] {
  const dates: Date[] = [];
  let cursor = startOfDay(params.firstDueDate);
  for (let i = 0; i < params.count; i += 1) {
    dates.push(cursor);
    if (i === params.count - 1) break;
    if (params.period === "WEEKLY") cursor = addWeeks(cursor, 1);
    else if (params.period === "BIWEEKLY") cursor = addWeeks(cursor, 2);
    else if (params.period === "MONTHLY") cursor = addMonths(cursor, 1);
    else cursor = addDays(cursor, Math.max(1, params.customPeriodDays ?? 30));
  }
  return dates;
}

function splitAmount(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const parts = Array.from({ length: count }, () => base);
  let remainder = cents - base * count;
  for (let i = 0; i < parts.length && remainder > 0; i += 1) {
    parts[i] += 1;
    remainder -= 1;
  }
  return parts.map((value) => value / 100);
}

async function syncOverdueStatuses(companyId: string): Promise<void> {
  const todayKey = todayCivilDateKey();
  const pending = await prisma.installment.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: "PENDING",
    },
    select: { id: true, dueDate: true },
  });
  const overdueIds = pending
    .filter((item) => dueCivilDateKey(item.dueDate) < todayKey)
    .map((item) => item.id);
  if (overdueIds.length === 0) return;
  await prisma.installment.updateMany({
    where: { id: { in: overdueIds }, companyId },
    data: { status: "OVERDUE" },
  });
}

export async function listCustomersCrm(
  companyId: string,
  filters?: { search?: string; phone?: string; financialStatus?: string },
): Promise<CustomerListCrmItemDTO[]> {
  assertTenantId(companyId);
  await syncOverdueStatuses(companyId);

  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(filters?.search
        ? { name: { contains: filters.search, mode: "insensitive" } }
        : {}),
      ...(filters?.phone
        ? { OR: [
            { phone: { contains: filters.phone } },
            { whatsapp: { contains: filters.phone } },
          ] }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      sales: {
        where: { deletedAt: null },
        include: {
          installments: {
            where: { deletedAt: null },
            include: {
              payments: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  });

  const items = customers.map((customer) => {
    const installments = customer.sales.flatMap((sale) =>
      sale.installments.map((item) =>
        toInstallmentDto({
          ...item,
          sale: {
            description: sale.description,
            customerId: customer.id,
            customer: { name: customer.name },
          },
        }),
      ),
    );
    const totalPurchased = roundMoney(
      customer.sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0),
    );
    const totalPaid = roundMoney(installments.reduce((acc, item) => acc + item.amountPaid, 0));
    const overdueCount = installments.filter((item) => item.status === "OVERDUE").length;
    const pendingCount = installments.filter(
      (item) => item.status === "PENDING" || item.status === "OVERDUE",
    ).length;
    const balanceDue = Math.max(0, roundMoney(totalPurchased - totalPaid));
    const lastPurchaseAt = customer.sales
      .map((sale) => sale.soldAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const financialStatus = computeFinancialStatus({
      overdue: overdueCount,
      pending: pendingCount,
    });

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      document: customer.document,
      totalPurchased,
      totalPaid,
      balanceDue,
      lastPurchaseAt: lastPurchaseAt?.toISOString() ?? null,
      financialStatus,
      formattedTotalPurchased: money(totalPurchased).formatted,
      formattedTotalPaid: money(totalPaid).formatted,
      formattedBalanceDue: money(balanceDue).formatted,
    };
  });

  if (!filters?.financialStatus) return items;
  return items.filter((item) => item.financialStatus === filters.financialStatus);
}

export async function getCustomerCrmDetail(
  companyId: string,
  customerId: string,
): Promise<import("../dto/crm.dto").CustomerCrmDetailDTO | null> {
  assertTenantId(companyId);
  await syncOverdueStatuses(companyId);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId, deletedAt: null },
    include: {
      sales: {
        where: { deletedAt: null },
        orderBy: { soldAt: "desc" },
        include: {
          category: { select: { name: true } },
          customer: { select: { name: true } },
          installments: {
            where: { deletedAt: null },
            orderBy: { number: "asc" },
            include: {
              payments: { where: { deletedAt: null } },
              sale: {
                select: {
                  description: true,
                  customerId: true,
                  customer: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!customer) return null;

  const installments = customer.sales.flatMap((sale) => sale.installments);
  const installmentDtos = installments.map(toInstallmentDto);
  const installmentBoard = buildCustomerInstallmentsBoard(installmentDtos);
  const payments: InstallmentPaymentHistoryDTO[] = installments
    .flatMap((item) =>
      item.payments.map((payment) => ({
        id: payment.id,
        installmentId: item.id,
        installmentNumber: item.number,
        saleDescription: item.sale.description,
        amount: roundMoney(Number(payment.amount)),
        formattedAmount: money(Number(payment.amount)).formatted,
        paidAt: payment.paidAt.toISOString(),
        paymentMethod: payment.paymentMethod,
        notes: payment.notes,
      })),
    )
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  const totalPurchased = roundMoney(
    customer.sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0),
  );
  const totalPaid = roundMoney(installmentDtos.reduce((acc, item) => acc + item.amountPaid, 0));
  const paidInstallments = installmentDtos.filter((item) => item.status === "PAID").length;
  const overdueInstallments = installmentDtos.filter((item) => item.status === "OVERDUE").length;
  const pendingInstallments = installmentDtos.filter(
    (item) => item.status === "PENDING" || item.status === "OVERDUE",
  ).length;
  const balanceDue = Math.max(0, roundMoney(totalPurchased - totalPaid));
  const lastPurchaseAt = customer.sales[0]?.soldAt ?? null;

  const summary: CustomerCrmSummaryDTO = {
    totalPurchased,
    totalPaid,
    balanceDue,
    salesCount: customer.sales.length,
    paidInstallments,
    pendingInstallments,
    overdueInstallments,
    lastPurchaseAt: lastPurchaseAt?.toISOString() ?? null,
    financialStatus: computeFinancialStatus({
      overdue: overdueInstallments,
      pending: pendingInstallments,
    }),
    formattedTotalPurchased: money(totalPurchased).formatted,
    formattedTotalPaid: money(totalPaid).formatted,
    formattedBalanceDue: money(balanceDue).formatted,
  };

  const sales: SaleDTO[] = customer.sales.map((sale) => ({
    id: sale.id,
    customerId: sale.customerId,
    customerName: sale.customer.name,
    description: sale.description,
    categoryId: sale.categoryId,
    categoryName: sale.category?.name ?? null,
    totalAmount: Number(sale.totalAmount),
    formattedTotalAmount: money(Number(sale.totalAmount)).formatted,
    paymentMethod: sale.paymentMethod,
    paymentMode: sale.paymentMode,
    installmentsCount: sale.installmentsCount,
    soldAt: sale.soldAt.toISOString(),
    notes: sale.notes,
  }));

  const timeline: TimelineItemDTO[] = [];
  for (const sale of customer.sales) {
    timeline.push({
      id: `sale-${sale.id}`,
      type: "SALE_CREATED",
      title: "Venda criada",
      detail: `${sale.description} · ${money(Number(sale.totalAmount)).formatted}`,
      at: sale.soldAt.toISOString(),
    });
    for (const installment of sale.installments) {
      timeline.push({
        id: `inst-${installment.id}`,
        type: "INSTALLMENT_CREATED",
        title: `Parcela ${installment.number} gerada`,
        detail: `${money(Number(installment.amount)).formatted} · venc. ${installment.dueDate.toISOString().slice(0, 10)}`,
        at: installment.createdAt.toISOString(),
      });
      for (const payment of installment.payments) {
        timeline.push({
          id: `paid-${payment.id}`,
          type: "INSTALLMENT_PAID",
          title: `Pagamento na parcela ${installment.number}`,
          detail: money(Number(payment.amount)).formatted,
          at: payment.paidAt.toISOString(),
        });
      }
    }
  }
  if (customer.notes?.trim()) {
    timeline.push({
      id: `note-${customer.id}`,
      type: "NOTE",
      title: "Observações do cliente",
      detail: customer.notes,
      at: customer.updatedAt.toISOString(),
    });
  }
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      document: customer.document,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      notes: customer.notes,
    },
    summary,
    sales,
    installments: installmentDtos,
    installmentBoard,
    payments,
    timeline,
    notes: customer.notes,
  };
}

export async function createSale(params: {
  companyId: string;
  userId: string;
  data: CreateSaleInput;
}): Promise<{ saleId: string }> {
  assertTenantId(params.companyId);
  const data = params.data;
  if (data.totalAmount <= 0) throw new Error("Informe um valor válido");

  // Cartão de crédito (maquininha): o parcelamento é do banco, não do cliente.
  // Registra como venda à vista paga — sem parcelas a receber.
  const isCardCredit = data.paymentMethod === "CARD_CREDIT";
  const paymentMode = isCardCredit ? "CASH" : data.paymentMode;
  const cashStatus = isCardCredit ? "PAID" : data.cashStatus;
  const cardInstallmentsNote =
    isCardCredit && (data.installmentsCount ?? 0) >= 2
      ? `Parcelado em ${data.installmentsCount}x no cartão (maquininha — sem cobrança mensal ao cliente).`
      : null;
  const mergedNotes = [data.notes, cardInstallmentsNote].filter(Boolean).join(" · ") || null;

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, companyId: params.companyId, deletedAt: null },
  });
  if (!customer) throw new Error("Cliente não encontrado");

  await assertCategoryBelongsToTenant(params.companyId, data.categoryId);

  const soldAt = data.soldAt ? new Date(data.soldAt) : new Date();
  const count = paymentMode === "CASH" ? 1 : Math.max(1, data.installmentsCount ?? 1);
  const firstDue =
    paymentMode === "CASH"
      ? startOfDay(soldAt)
      : data.firstDueDate
        ? startOfDay(new Date(`${data.firstDueDate.slice(0, 10)}T12:00:00`))
        : startOfDay(soldAt);
  const period = data.period ?? "MONTHLY";
  const amounts = splitAmount(data.totalAmount, count);
  const dueDates =
    paymentMode === "CASH"
      ? [firstDue]
      : buildDueDates({
          count,
          firstDueDate: firstDue,
          period,
          customPeriodDays: data.customPeriodDays,
        });

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        companyId: params.companyId,
        customerId: data.customerId,
        description: data.description,
        categoryId: data.categoryId || null,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        paymentMode,
        installmentsCount: count,
        firstDueDate: firstDue,
        period: paymentMode === "INSTALLMENT" ? period : null,
        customPeriodDays: data.period === "CUSTOM" ? data.customPeriodDays ?? null : null,
        soldAt,
        notes: mergedNotes,
      },
    });

    for (let i = 0; i < count; i += 1) {
      const isCashPaid = paymentMode === "CASH" && cashStatus === "PAID";
      const status = isCashPaid
        ? "PAID"
        : dueCivilDateKey(dueDates[i]) < todayCivilDateKey()
          ? "OVERDUE"
          : "PENDING";

      let transactionId: string | null = null;
      if (isCashPaid) {
        const descriptionSuffix = isCardCredit
          ? cardInstallmentsNote
            ? ` (crédito · ${data.installmentsCount}x)`
            : " (cartão de crédito)"
          : " (à vista)";
        const transaction = await tx.transaction.create({
          data: {
            companyId: params.companyId,
            type: "INCOME",
            status: "PAID",
            paymentMethod: data.paymentMethod,
            amount: amounts[i],
            description: `${data.description}${descriptionSuffix}`,
            notes: mergedNotes,
            date: soldAt,
            dueDate: dueDates[i],
            paidAt: soldAt,
            categoryId: data.categoryId || null,
            customerId: data.customerId,
          },
        });
        transactionId = transaction.id;
      } else if (paymentMode === "CASH" && cashStatus === "PENDING") {
        const transaction = await tx.transaction.create({
          data: {
            companyId: params.companyId,
            type: "INCOME",
            status: "PENDING",
            paymentMethod: data.paymentMethod,
            amount: amounts[i],
            description: `${data.description} (à vista · pendente)`,
            notes: mergedNotes,
            date: soldAt,
            dueDate: dueDates[i],
            categoryId: data.categoryId || null,
            customerId: data.customerId,
          },
        });
        transactionId = transaction.id;
      }

      const installment = await tx.installment.create({
        data: {
          companyId: params.companyId,
          saleId: sale.id,
          number: i + 1,
          amount: amounts[i],
          dueDate: dueDates[i],
          status,
          paidAt: isCashPaid ? soldAt : null,
          paymentMethod: isCashPaid ? data.paymentMethod : null,
          transactionId,
        },
      });

      if (isCashPaid && transactionId) {
        await tx.installmentPayment.create({
          data: {
            companyId: params.companyId,
            installmentId: installment.id,
            amount: amounts[i],
            paidAt: soldAt,
            paymentMethod: data.paymentMethod,
            notes: mergedNotes,
            transactionId,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: "crm",
        action: "SALE_CREATED",
        entity: "Sale",
        entityId: sale.id,
        metadata: {
          customerId: data.customerId,
          totalAmount: data.totalAmount,
          paymentMode,
          paymentMethod: data.paymentMethod,
          cardCreditSettled: isCardCredit,
        },
      },
    });

    return sale;
  });

  invalidateCrmCaches(params.companyId);
  await prisma.notification.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      title: "Nova venda",
      message: `${data.description} · ${money(data.totalAmount).formatted}`,
      category: "CUSTOMERS",
    },
  }).catch(() => undefined);
  return { saleId: result.id };
}

export async function updateSale(params: {
  companyId: string;
  userId: string;
  data: UpdateSaleInput;
}): Promise<void> {
  assertTenantId(params.companyId);
  const data = params.data;

  const sale = await prisma.sale.findFirst({
    where: { id: data.id, companyId: params.companyId, deletedAt: null },
    include: {
      installments: {
        where: { deletedAt: null },
        include: { payments: { where: { deletedAt: null } } },
      },
    },
  });
  if (!sale) throw new Error("Venda não encontrada");

  await assertCategoryBelongsToTenant(params.companyId, data.categoryId);

  const hasReceivedPayment = sale.installments.some(
    (item) => item.status === "PAID" || sumPaymentAmounts(item.payments) > 0,
  );
  const amountChanged = roundMoney(Number(sale.totalAmount)) !== roundMoney(data.totalAmount);

  if (amountChanged) {
    if (hasReceivedPayment) {
      throw new Error("Não dá para alterar o valor depois que já houve pagamento.");
    }
    if (sale.paymentMode !== "CASH" || sale.installments.length !== 1) {
      throw new Error(
        "Para mudar o valor de venda parcelada, edite cada parcela individualmente.",
      );
    }
  }

  const soldAt = new Date(`${data.soldAt.slice(0, 10)}T12:00:00`);

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        description: data.description,
        categoryId: data.categoryId || null,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        soldAt,
        notes: data.notes ?? null,
      },
    });

    if (amountChanged && sale.installments.length === 1) {
      const installment = sale.installments[0];
      await tx.installment.update({
        where: { id: installment.id },
        data: { amount: data.totalAmount },
      });
      if (installment.transactionId) {
        await tx.transaction.update({
          where: { id: installment.transactionId },
          data: {
            amount: data.totalAmount,
            description: `${data.description}${
              sale.paymentMode === "CASH" ? " (à vista)" : ""
            }`,
            paymentMethod: data.paymentMethod,
            categoryId: data.categoryId || null,
            date: soldAt,
            notes: data.notes ?? null,
          },
        });
      }
    } else {
      for (const installment of sale.installments) {
        if (installment.transactionId) {
          await tx.transaction.update({
            where: { id: installment.transactionId },
            data: {
              paymentMethod: data.paymentMethod,
              categoryId: data.categoryId || null,
              notes: data.notes ?? null,
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: "crm",
        action: "SALE_UPDATED",
        entity: "Sale",
        entityId: sale.id,
        metadata: {
          description: data.description,
          totalAmount: data.totalAmount,
        },
      },
    });
  });

  invalidateCrmCaches(params.companyId);
}

export async function updateInstallment(params: {
  companyId: string;
  userId: string;
  data: UpdateInstallmentInput;
}): Promise<void> {
  assertTenantId(params.companyId);
  const data = params.data;

  const installment = await prisma.installment.findFirst({
    where: { id: data.id, companyId: params.companyId, deletedAt: null },
    include: {
      payments: { where: { deletedAt: null } },
      sale: true,
    },
  });
  if (!installment) throw new Error("Parcela não encontrada");
  if (installment.status === "CANCELED") throw new Error("Parcela cancelada não pode ser editada");
  if (installment.status === "PAID" || sumPaymentAmounts(installment.payments) > 0) {
    throw new Error("Parcela com pagamento não pode ser editada. Cancele só se ainda estiver aberta.");
  }

  const dueDate = startOfDay(new Date(`${data.dueDate.slice(0, 10)}T12:00:00`));
  const status = dueCivilDateKey(dueDate) < todayCivilDateKey() ? "OVERDUE" : "PENDING";

  await prisma.$transaction(async (tx) => {
    await tx.installment.update({
      where: { id: installment.id },
      data: {
        amount: data.amount,
        dueDate,
        status,
        notes: data.notes ?? null,
      },
    });

    if (installment.transactionId) {
      await tx.transaction.update({
        where: { id: installment.transactionId },
        data: {
          amount: data.amount,
          dueDate,
          date: dueDate,
          notes: data.notes ?? null,
          status,
        },
      });
    }

    const refreshed = await tx.installment.findMany({
      where: { saleId: installment.saleId, deletedAt: null, status: { not: "CANCELED" } },
      select: { amount: true },
    });
    const newTotal = roundMoney(refreshed.reduce((sum, item) => sum + Number(item.amount), 0));
    await tx.sale.update({
      where: { id: installment.saleId },
      data: { totalAmount: newTotal },
    });

    await tx.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: "crm",
        action: "INSTALLMENT_UPDATED",
        entity: "Installment",
        entityId: installment.id,
        metadata: { amount: data.amount, dueDate: data.dueDate },
      },
    });
  });

  invalidateCrmCaches(params.companyId);
}

export async function cancelSale(params: {
  companyId: string;
  userId: string;
  saleId: string;
}): Promise<void> {
  assertTenantId(params.companyId);

  const sale = await prisma.sale.findFirst({
    where: { id: params.saleId, companyId: params.companyId, deletedAt: null },
    include: {
      installments: {
        where: { deletedAt: null },
        include: { payments: { where: { deletedAt: null } } },
      },
    },
  });
  if (!sale) throw new Error("Venda não encontrada");

  const hasReceivedPayment = sale.installments.some(
    (item) => item.status === "PAID" || sumPaymentAmounts(item.payments) > 0,
  );
  if (hasReceivedPayment) {
    throw new Error(
      "Essa venda já tem pagamento. Não dá para excluir — edite só o que ainda estiver aberto.",
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const installment of sale.installments) {
      if (installment.transactionId) {
        await tx.transaction.update({
          where: { id: installment.transactionId },
          data: { deletedAt: now, status: "CANCELED" },
        });
      }
      await tx.installment.update({
        where: { id: installment.id },
        data: { deletedAt: now, status: "CANCELED" },
      });
    }
    await tx.sale.update({
      where: { id: sale.id },
      data: { deletedAt: now },
    });
    await tx.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: "crm",
        action: "SALE_CANCELED",
        entity: "Sale",
        entityId: sale.id,
        metadata: { description: sale.description },
      },
    });
  });

  invalidateCrmCaches(params.companyId);
}

export async function receiveInstallment(params: {
  companyId: string;
  userId: string;
  data: ReceiveInstallmentInput;
}): Promise<{ fullyPaid: boolean; amountRemaining: number }> {
  assertTenantId(params.companyId);
  const installment = await prisma.installment.findFirst({
    where: {
      id: params.data.installmentId,
      companyId: params.companyId,
      deletedAt: null,
    },
    include: {
      sale: true,
      payments: { where: { deletedAt: null } },
    },
  });
  if (!installment) throw new Error("Parcela não encontrada");
  if (params.data.amount <= 0) throw new Error("Informe um valor válido");

  const installmentAmount = roundMoney(Number(installment.amount));
  const alreadyPaid = sumPaymentAmounts(installment.payments);
  const remainingBefore = roundMoney(Math.max(0, installmentAmount - alreadyPaid));

  if (remainingBefore <= 0) {
    throw new Error("Parcela já está paga");
  }

  const received = roundMoney(params.data.amount);
  if (received > remainingBefore + 0.001) {
    throw new Error(
      `Valor maior que o saldo da parcela (${money(remainingBefore).formatted})`,
    );
  }

  const paidAt = new Date(params.data.paidAt);
  const remainingAfter = roundMoney(Math.max(0, remainingBefore - received));
  const fullyPaid = remainingAfter <= 0.001;

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        companyId: params.companyId,
        type: "INCOME",
        status: "PAID",
        paymentMethod: params.data.paymentMethod,
        amount: received,
        description: fullyPaid
          ? `${installment.sale.description} · Parcela ${installment.number}`
          : `${installment.sale.description} · Parcela ${installment.number} (parcial)`,
        notes: params.data.notes ?? null,
        date: paidAt,
        dueDate: installment.dueDate,
        paidAt,
        categoryId: installment.sale.categoryId,
        customerId: installment.sale.customerId,
      },
    });

    await tx.installmentPayment.create({
      data: {
        companyId: params.companyId,
        installmentId: installment.id,
        amount: received,
        paidAt,
        paymentMethod: params.data.paymentMethod,
        notes: params.data.notes ?? null,
        transactionId: transaction.id,
      },
    });

    await tx.installment.update({
      where: { id: installment.id },
      data: fullyPaid
        ? {
            status: "PAID",
            paidAt,
            paymentMethod: params.data.paymentMethod,
            transactionId: transaction.id,
            notes: params.data.notes ?? installment.notes,
          }
        : {
            status: dueCivilDateKey(installment.dueDate) < todayCivilDateKey()
              ? "OVERDUE"
              : "PENDING",
            paidAt: null,
            paymentMethod: null,
            notes: params.data.notes ?? installment.notes,
          },
    });

    await tx.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: "crm",
        action: fullyPaid ? "INSTALLMENT_RECEIVED" : "INSTALLMENT_PARTIAL_RECEIVED",
        entity: "Installment",
        entityId: installment.id,
        metadata: {
          amount: received,
          amountRemaining: remainingAfter,
          saleId: installment.saleId,
        },
      },
    });
  });

  invalidateCrmCaches(params.companyId);
  await prisma.notification.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      title: fullyPaid ? "Parcela recebida" : "Pagamento parcial",
      message: `Recebido ${money(params.data.amount).formatted} da parcela #${installment.number}`,
      category: "INSTALLMENTS",
    },
  }).catch(() => undefined);
  return { fullyPaid, amountRemaining: remainingAfter };
}

export async function getReceivablesOverview(
  companyId: string,
  options?: {
    yearMonth?: string;
    status?: "all" | "pending" | "paid" | "overdue";
  },
): Promise<ReceivablesOverviewDTO> {
  assertTenantId(companyId);
  await syncOverdueStatuses(companyId);

  const now = new Date();
  const status = options?.status ?? "all";

  let rangeStart: Date;
  let rangeEnd: Date;
  let yearMonth: string;

  if (options?.yearMonth && /^\d{4}-\d{2}$/.test(options.yearMonth)) {
    const [year, month] = options.yearMonth.split("-").map(Number);
    const cursor = new Date(year, month - 1, 1);
    rangeStart = startOfMonth(cursor);
    rangeEnd = endOfMonth(cursor);
    yearMonth = options.yearMonth;
  } else {
    rangeStart = startOfMonth(now);
    rangeEnd = endOfMonth(now);
    yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const where: Record<string, unknown> = {
    companyId,
    deletedAt: null,
    dueDate: { gte: rangeStart, lte: rangeEnd },
  };

  if (status === "paid") where.status = "PAID";
  if (status === "pending") where.status = { in: ["PENDING", "OVERDUE"] };
  if (status === "overdue") where.status = "OVERDUE";

  const rows = await prisma.installment.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { number: "asc" }],
    include: {
      payments: { where: { deletedAt: null } },
      sale: {
        select: {
          description: true,
          customerId: true,
          customer: { select: { name: true } },
        },
      },
    },
  });

  const items = rows.map(toInstallmentDto);
  const totalReceivable = items
    .filter((item) => item.status === "PENDING" || item.status === "OVERDUE")
    .reduce((acc, item) => acc + item.amountRemaining, 0);
  const totalReceived = items.reduce((acc, item) => acc + item.amountPaid, 0);
  const totalOverdue = items
    .filter((item) => item.status === "OVERDUE")
    .reduce((acc, item) => acc + item.amountRemaining, 0);

  const periodLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(rangeStart);

  return {
    items,
    totalReceivable,
    totalReceived,
    totalOverdue,
    formattedTotalReceivable: money(totalReceivable).formatted,
    formattedTotalReceived: money(totalReceived).formatted,
    formattedTotalOverdue: money(totalOverdue).formatted,
    yearMonth,
    periodLabel,
  };
}

export async function getCrmDashboardStats(companyId: string): Promise<{
  customersCount: number;
  overdueCustomers: number;
  totalReceivable: number;
  receivedMonth: number;
  pendingInstallments: number;
  paidInstallments: number;
  overdueInstallments: number;
  topCustomerName: string | null;
  topCustomerAmount: number;
}> {
  assertTenantId(companyId);
  await syncOverdueStatuses(companyId);

  const now = new Date();
  const [customersCount, installments, sales] = await Promise.all([
    prisma.customer.count({ where: { companyId, deletedAt: null } }),
    prisma.installment.findMany({
      where: { companyId, deletedAt: null },
      include: {
        payments: { where: { deletedAt: null } },
        sale: { select: { customerId: true, customer: { select: { name: true } } } },
      },
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { companyId, deletedAt: null },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 1,
    }),
  ]);

  const installmentDtos = installments.map((item) =>
    toInstallmentDto({
      ...item,
      sale: {
        description: "",
        customerId: item.sale.customerId,
        customer: item.sale.customer,
      },
    }),
  );

  const overdueInstallments = installmentDtos.filter((item) => item.status === "OVERDUE").length;
  const pendingInstallments = installmentDtos.filter(
    (item) => item.status === "PENDING" || item.status === "OVERDUE",
  ).length;
  const paidInstallments = installmentDtos.filter((item) => item.status === "PAID").length;
  const totalReceivable = installmentDtos
    .filter((item) => item.status === "PENDING" || item.status === "OVERDUE")
    .reduce((acc, item) => acc + item.amountRemaining, 0);
  const receivedMonth = installments
    .flatMap((item) => item.payments)
    .filter(
      (payment) =>
        payment.paidAt >= startOfMonth(now) && payment.paidAt <= endOfMonth(now),
    )
    .reduce((acc, payment) => acc + Number(payment.amount), 0);

  const overdueCustomerIds = new Set(
    installmentDtos
      .filter((item) => item.status === "OVERDUE")
      .map((item) => item.customerId),
  );

  let topCustomerName: string | null = null;
  let topCustomerAmount = 0;
  if (sales[0]) {
    const customer = await prisma.customer.findFirst({
      where: { id: sales[0].customerId, companyId, deletedAt: null },
      select: { name: true },
    });
    topCustomerName = customer?.name ?? null;
    topCustomerAmount = Number(sales[0]._sum.totalAmount ?? 0);
  }

  return {
    customersCount,
    overdueCustomers: overdueCustomerIds.size,
    totalReceivable,
    receivedMonth,
    pendingInstallments,
    paidInstallments,
    overdueInstallments,
    topCustomerName,
    topCustomerAmount,
  };
}
