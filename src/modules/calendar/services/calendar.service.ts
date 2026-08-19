import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import {
  EVENT_COLORS,
  type CalendarEventDTO,
  type CalendarOverviewDTO,
  type OverdueCustomerDTO,
} from "../dto/calendar.dto";

function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sumPaymentAmounts(payments?: Array<{ amount: unknown }> | null): number {
  if (!payments?.length) return 0;
  return roundMoney(payments.reduce((acc, payment) => acc + Number(payment.amount), 0));
}

function moneyFields(amount: number) {
  const formatted = money(amount);
  return {
    amount,
    formattedAmount: formatted,
    amountRemaining: amount,
    formattedAmountRemaining: formatted,
    amountPaid: 0,
    formattedAmountPaid: money(0),
    originalAmount: amount,
    formattedOriginalAmount: formatted,
    isPartial: false,
  };
}

function parseAnchor(monthKey?: string): Date {
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [y, m] = monthKey.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  return new Date();
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function statusLabel(status: string | null, isPartial = false): string {
  if (isPartial && status !== "PAID") return "Parcial · ainda falta";
  const map: Record<string, string> = {
    PAID: "Pago",
    PENDING: "Pendente",
    OVERDUE: "Atrasado",
    CANCELED: "Cancelado",
    META: "Meta",
  };
  return status ? map[status] ?? status : "—";
}

function contactPhone(customer: {
  phone?: string | null;
  whatsapp?: string | null;
} | null): string | null {
  return customer?.whatsapp || customer?.phone || null;
}

function resolveInstallmentOpenStatus(
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED",
  dueDate: Date,
  today: Date,
  remaining: number,
): "PENDING" | "OVERDUE" | null {
  if (remaining <= 0.001) return null;
  if (status === "CANCELED") return null;
  if (status === "OVERDUE" || isBefore(endOfDay(dueDate), today)) return "OVERDUE";
  return "PENDING";
}

function toInstallmentEvent(
  item: {
    id: string;
    number: number;
    amount: unknown;
    dueDate: Date;
    status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
    paymentMethod: string | null;
    notes: string | null;
    sale: {
      description: string;
      customerId: string;
      customer: { id: string; name: string; phone: string | null; whatsapp: string | null };
    };
    payments?: Array<{ amount: unknown }> | null;
  },
  today: Date,
): CalendarEventDTO | null {
  const originalAmount = roundMoney(Number(item.amount));
  const amountPaid = sumPaymentAmounts(item.payments);
  // Legacy fully-paid without payment rows
  const effectivePaid =
    amountPaid > 0 ? amountPaid : item.status === "PAID" ? originalAmount : 0;
  const amountRemaining = roundMoney(Math.max(0, originalAmount - effectivePaid));
  const openStatus = resolveInstallmentOpenStatus(
    item.status,
    item.dueDate,
    today,
    amountRemaining,
  );
  if (!openStatus) return null;

  const isPartial = effectivePaid > 0 && amountRemaining > 0;
  const overdue = openStatus === "OVERDUE";
  const type = overdue ? "OVERDUE" : isPartial ? "PARTIAL" : "DUE";
  const customerName = item.sale.customer.name;

  let title: string;
  if (overdue && isPartial) title = `Atrasada (parcial) · ${customerName}`;
  else if (overdue) title = `Atrasada · ${customerName}`;
  else if (isPartial) title = `Parcial · ${customerName}`;
  else title = `Parcela · ${customerName}`;

  return {
    id: `inst-${item.id}`,
    type,
    title,
    description: isPartial
      ? `${item.sale.description} · parcela ${item.number} · pago ${money(effectivePaid)} · falta ${money(amountRemaining)}`
      : `${item.sale.description} · parcela ${item.number}`,
    amount: amountRemaining,
    formattedAmount: money(amountRemaining),
    amountRemaining,
    formattedAmountRemaining: money(amountRemaining),
    amountPaid: effectivePaid,
    formattedAmountPaid: money(effectivePaid),
    originalAmount,
    formattedOriginalAmount: money(originalAmount),
    isPartial,
    date: item.dueDate.toISOString(),
    status: openStatus,
    statusLabel: statusLabel(openStatus, isPartial),
    paymentMethod: item.paymentMethod,
    customerId: item.sale.customerId,
    customerName,
    customerPhone: contactPhone(item.sale.customer),
    categoryId: null,
    categoryName: null,
    notes: item.notes,
    source: "INSTALLMENT",
    sourceId: item.id,
    color: overdue ? EVENT_COLORS.OVERDUE : isPartial ? EVENT_COLORS.PARTIAL : EVENT_COLORS.DUE,
  };
}

function groupOverdueCustomers(events: CalendarEventDTO[]): OverdueCustomerDTO[] {
  const map = new Map<string, OverdueCustomerDTO>();
  for (const event of events) {
    if (event.type !== "OVERDUE" || !event.customerId) continue;
    const current = map.get(event.customerId);
    if (!current) {
      map.set(event.customerId, {
        customerId: event.customerId,
        customerName: event.customerName ?? "Cliente",
        customerPhone: event.customerPhone,
        installmentsCount: 1,
        totalAmount: event.amount,
        formattedTotalAmount: money(event.amount),
        oldestDueDate: event.date,
        oldestDueDateLabel: format(new Date(event.date), "dd/MM/yyyy"),
        events: [event],
      });
      continue;
    }
    current.installmentsCount += 1;
    current.totalAmount += event.amount;
    current.formattedTotalAmount = money(current.totalAmount);
    current.events.push(event);
    if (new Date(event.date) < new Date(current.oldestDueDate)) {
      current.oldestDueDate = event.date;
      current.oldestDueDateLabel = format(new Date(event.date), "dd/MM/yyyy");
    }
  }
  return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function getCalendarOverview(
  companyId: string,
  monthKey?: string,
): Promise<CalendarOverviewDTO> {
  assertTenantId(companyId);
  const anchor = parseAnchor(monthKey);
  const rangeStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const rangeEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const today = startOfDay(new Date());
  const weekEnd = endOfDay(addDays(today, 7));

  const installmentInclude = {
    payments: { where: { deletedAt: null } },
    sale: {
      select: {
        description: true,
        customerId: true,
        customer: {
          select: { id: true, name: true, phone: true, whatsapp: true },
        },
      },
    },
  } as const;

  const [transactions, monthInstallments, openInstallments, settings] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { date: { gte: rangeStart, lte: rangeEnd } },
          { dueDate: { gte: rangeStart, lte: rangeEnd } },
          { paidAt: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.installment.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { not: "CANCELED" },
        dueDate: { gte: rangeStart, lte: rangeEnd },
      },
      include: installmentInclude,
      orderBy: { dueDate: "asc" },
    }),
    // Open parcels with remaining balance: overdue + any partial not fully settled
    prisma.installment.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { not: "CANCELED" },
        OR: [
          { dueDate: { lt: today }, status: { in: ["PENDING", "OVERDUE"] } },
          { payments: { some: { deletedAt: null } }, status: { in: ["PENDING", "OVERDUE"] } },
        ],
      },
      include: installmentInclude,
      orderBy: { dueDate: "asc" },
      take: 300,
    }),
    prisma.companySettings.findUnique({ where: { companyId } }),
  ]);

  const events: CalendarEventDTO[] = [];
  const installmentIds = new Set<string>();

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const phone = contactPhone(tx.customer);
    const fields = moneyFields(amount);
    const isPartialReceipt =
      tx.type === "INCOME" &&
      tx.status === "PAID" &&
      (tx.description?.toLowerCase().includes("(parcial)") ?? false);

    if (tx.type === "INCOME" && tx.status === "PAID") {
      events.push({
        id: `tx-paid-${tx.id}`,
        type: "RECEIPT",
        title: isPartialReceipt
          ? tx.customer?.name
            ? `Pagamento parcial · ${tx.customer.name}`
            : "Pagamento parcial"
          : tx.customer?.name
            ? `Recebido · ${tx.customer.name}`
            : (tx.description ?? "Recebido"),
        description: tx.description,
        ...fields,
        date: (tx.paidAt ?? tx.date).toISOString(),
        status: tx.status,
        statusLabel: isPartialReceipt ? "Pagamento parcial" : statusLabel(tx.status),
        paymentMethod: tx.paymentMethod,
        customerId: tx.customerId,
        customerName: tx.customer?.name ?? null,
        customerPhone: phone,
        categoryId: tx.categoryId,
        categoryName: tx.category?.name ?? null,
        notes: tx.notes,
        source: "TRANSACTION",
        sourceId: tx.id,
        color: isPartialReceipt ? EVENT_COLORS.PARTIAL : EVENT_COLORS.RECEIPT,
      });
    } else if (tx.type === "INCOME" && tx.status !== "CANCELED") {
      events.push({
        id: `tx-income-${tx.id}`,
        type: "INCOME",
        title: tx.customer?.name
          ? `A receber · ${tx.customer.name}`
          : (tx.description ?? "A receber"),
        description: tx.description,
        ...fields,
        date: (tx.dueDate ?? tx.date).toISOString(),
        status: tx.status,
        statusLabel: statusLabel(tx.status),
        paymentMethod: tx.paymentMethod,
        customerId: tx.customerId,
        customerName: tx.customer?.name ?? null,
        customerPhone: phone,
        categoryId: tx.categoryId,
        categoryName: tx.category?.name ?? null,
        notes: tx.notes,
        source: "TRANSACTION",
        sourceId: tx.id,
        color: EVENT_COLORS.INCOME,
      });
    } else if (tx.type === "EXPENSE" && tx.status !== "CANCELED") {
      events.push({
        id: `tx-expense-${tx.id}`,
        type: "EXPENSE",
        title: tx.description ?? "A pagar",
        description: tx.description,
        ...fields,
        date: (tx.dueDate ?? tx.date).toISOString(),
        status: tx.status,
        statusLabel: statusLabel(tx.status),
        paymentMethod: tx.paymentMethod,
        customerId: tx.customerId,
        customerName: tx.customer?.name ?? null,
        customerPhone: phone,
        categoryId: tx.categoryId,
        categoryName: tx.category?.name ?? null,
        notes: tx.notes,
        source: "TRANSACTION",
        sourceId: tx.id,
        color: EVENT_COLORS.EXPENSE,
      });
    }
  }

  for (const item of [...monthInstallments, ...openInstallments]) {
    if (installmentIds.has(item.id)) continue;
    installmentIds.add(item.id);
    const event = toInstallmentEvent(item, today);
    if (event) events.push(event);
  }

  const goal = Number(settings?.monthlyGoal ?? 0);
  if (goal > 0) {
    events.push({
      id: `meta-${formatMonthKey(anchor)}`,
      type: "META",
      title: "Meta mensal",
      description: "Meta de receita do mês",
      ...moneyFields(goal),
      date: endOfMonth(anchor).toISOString(),
      status: "META",
      statusLabel: "Meta",
      paymentMethod: null,
      customerId: null,
      customerName: null,
      customerPhone: null,
      categoryId: null,
      categoryName: null,
      notes: null,
      source: "META",
      sourceId: companyId,
      color: EVENT_COLORS.META,
    });
  }

  const overdueEvents = events
    .filter((event) => event.type === "OVERDUE")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const partialEvents = events
    .filter((event) => event.isPartial && event.source === "INSTALLMENT")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const todayEvents = events
    .filter((event) => isSameDay(new Date(event.date), today))
    .sort((a, b) => b.amount - a.amount);

  const upcomingDue = events
    .filter((event) => {
      if (event.type !== "DUE" && event.type !== "INCOME" && event.type !== "PARTIAL") return false;
      const date = startOfDay(new Date(event.date));
      return date >= today && date <= weekEnd;
    })
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 10);

  const dueTodayEvents = events.filter(
    (event) =>
      (event.type === "DUE" ||
        event.type === "INCOME" ||
        event.type === "OVERDUE" ||
        event.type === "PARTIAL") &&
      isSameDay(new Date(event.date), today),
  );
  const dueThisWeekEvents = events.filter((event) => {
    if (event.type !== "DUE" && event.type !== "INCOME" && event.type !== "PARTIAL") return false;
    const date = startOfDay(new Date(event.date));
    return date >= today && date <= weekEnd;
  });

  const overdueTotal = overdueEvents.reduce((acc, e) => acc + e.amount, 0);
  const dueTodayTotal = dueTodayEvents.reduce((acc, e) => acc + e.amount, 0);
  const dueThisWeekTotal = dueThisWeekEvents.reduce((acc, e) => acc + e.amount, 0);
  const projectedIncome = events
    .filter(
      (e) =>
        e.type === "INCOME" || e.type === "DUE" || e.type === "OVERDUE" || e.type === "PARTIAL",
    )
    .reduce((acc, e) => acc + e.amount, 0);
  const projectedExpense = events
    .filter((e) => e.type === "EXPENSE" && e.status !== "PAID")
    .reduce((acc, e) => acc + e.amount, 0);

  return {
    events,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    summary: {
      overdueTotal,
      overdueCount: overdueEvents.length,
      dueTodayTotal,
      dueTodayCount: dueTodayEvents.length,
      dueThisWeekTotal,
      dueThisWeekCount: dueThisWeekEvents.length,
      projectedIncome,
      projectedExpense,
      formattedOverdueTotal: money(overdueTotal),
      formattedDueTodayTotal: money(dueTodayTotal),
      formattedDueThisWeekTotal: money(dueThisWeekTotal),
      formattedProjectedIncome: money(projectedIncome),
      formattedProjectedExpense: money(projectedExpense),
    },
    sidebar: {
      today: todayEvents,
      upcomingDue,
      overdueInstallments: overdueEvents.slice(0, 20),
      overdueCustomers: groupOverdueCustomers(overdueEvents),
      partialInstallments: partialEvents.slice(0, 20),
    },
  };
}

export function formatCalendarMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy", { locale: ptBR });
}
