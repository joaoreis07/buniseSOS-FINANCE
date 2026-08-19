import { unstable_cache } from "next/cache";
import { getCrmDashboardStats } from "@/modules/crm/services/crm.service";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import type { DashboardResponseDTO } from "../dto/dashboard.dto";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function sumByType(
  rows: Array<{ type: "INCOME" | "EXPENSE" | "TRANSFER"; _sum: { amount: unknown } }>,
  type: "INCOME" | "EXPENSE",
): number {
  const row = rows.find((item) => item.type === type);
  return row?._sum.amount ? Number(row._sum.amount) : 0;
}

async function loadDashboard(companyId: string): Promise<DashboardResponseDTO> {
  assertTenantId(companyId);

  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousStart = startOfMonth(addMonths(now, -1));
  const previousEnd = endOfMonth(addMonths(now, -1));
  const chartStart = startOfMonth(addMonths(now, -5));

  const [
    currentGrouped,
    previousGrouped,
    balanceGrouped,
    activeCustomers,
    newCustomersMonth,
    previousNewCustomers,
    settings,
    chartTransactions,
    recentTransactions,
    notifications,
    categoryIncome,
    categoryExpense,
    paidIncomeCount,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        date: { gte: currentStart, lte: currentEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        date: { gte: previousStart, lte: previousEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
      },
      _sum: { amount: true },
    }),
    prisma.customer.count({
      where: { companyId, deletedAt: null, status: "ACTIVE" },
    }),
    prisma.customer.count({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: currentStart, lte: currentEnd },
      },
    }),
    prisma.customer.count({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: previousStart, lte: previousEnd },
      },
    }),
    prisma.companySettings.findUnique({ where: { companyId } }),
    prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        date: { gte: chartStart, lte: currentEnd },
      },
      select: { type: true, amount: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { companyId, deletedAt: null },
      include: { customer: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 8,
    }),
    prisma.notification.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        type: "INCOME",
        date: { gte: currentStart, lte: currentEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        type: "EXPENSE",
        date: { gte: currentStart, lte: currentEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        type: "INCOME",
        date: { gte: currentStart, lte: currentEnd },
      },
    }),
  ]);

  const crmStats = await getCrmDashboardStats(companyId).catch(() => ({
    customersCount: activeCustomers,
    overdueCustomers: 0,
    totalReceivable: 0,
    receivedMonth: 0,
    pendingInstallments: 0,
    paidInstallments: 0,
    overdueInstallments: 0,
    topCustomerName: null as string | null,
    topCustomerAmount: 0,
  }));

  const revenueMonth = sumByType(currentGrouped, "INCOME");
  const expensesMonth = sumByType(currentGrouped, "EXPENSE");
  const netProfitMonth = revenueMonth - expensesMonth;

  const previousRevenue = sumByType(previousGrouped, "INCOME");
  const previousExpenses = sumByType(previousGrouped, "EXPENSE");
  const previousProfit = previousRevenue - previousExpenses;

  const totalIncome = sumByType(balanceGrouped, "INCOME");
  const totalExpenses = sumByType(balanceGrouped, "EXPENSE");
  const currentBalance = totalIncome - totalExpenses;

  const monthlyGoal = settings ? Number(settings.monthlyGoal) : 0;
  const goalProgressPercent =
    monthlyGoal > 0 ? Math.min(100, (revenueMonth / monthlyGoal) * 100) : 0;

  const trend = (current: number, previous: number): number | null => {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const revenueTrend = trend(revenueMonth, previousRevenue);
  const profitTrend = trend(netProfitMonth, previousProfit);
  const customersTrend = trend(activeCustomers, Math.max(activeCustomers - newCustomersMonth, 1));
  const newCustomersTrend = trend(newCustomersMonth, previousNewCustomers);

  const monthlyComparison = Array.from({ length: 6 }).map((_, index) => {
    const monthDate = addMonths(chartStart, index);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const inMonth = chartTransactions.filter(
      (item) => item.date >= start && item.date <= end,
    );
    const revenue = inMonth
      .filter((item) => item.type === "INCOME")
      .reduce((acc, item) => acc + Number(item.amount), 0);
    const expenses = inMonth
      .filter((item) => item.type === "EXPENSE")
      .reduce((acc, item) => acc + Number(item.amount), 0);
    return {
      month: monthLabel(monthDate),
      revenue,
      expenses,
      profit: revenue - expenses,
    };
  });

  const categoryIds = [
    ...categoryIncome.map((item) => item.categoryId).filter(Boolean),
    ...categoryExpense.map((item) => item.categoryId).filter(Boolean),
  ] as string[];

  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds }, companyId, deletedAt: null },
        select: { id: true, name: true },
      })
    : [];

  const categoryName = (id: string | null): string =>
    categories.find((item) => item.id === id)?.name ?? "Sem categoria";

  const delinquency = await prisma.transaction.aggregate({
    where: {
      companyId,
      deletedAt: null,
      type: "INCOME",
      status: { in: ["PENDING", "OVERDUE"] },
    },
    _sum: { amount: true },
  });

  const averageTicket = paidIncomeCount > 0 ? revenueMonth / paidIncomeCount : 0;
  const profitMarginPercent = revenueMonth > 0 ? (netProfitMonth / revenueMonth) * 100 : 0;
  const delinquencyAmount = delinquency._sum.amount ? Number(delinquency._sum.amount) : 0;

  const periodLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(now);

  return {
    companyId,
    generatedAt: now.toISOString(),
    periodLabel,
    revenueMonth,
    expensesMonth,
    netProfitMonth,
    currentBalance,
    activeCustomers,
    newCustomersMonth,
    monthlyGoal,
    goalProgressPercent,
    monthlyComparison,
    recentMovements: recentTransactions.map((item) => ({
      id: item.id,
      customerName: item.customer?.name ?? null,
      description: item.description ?? "Movimentação",
      amount: Number(item.amount),
      formattedAmount: formatCurrency(Number(item.amount)),
      type: item.type,
      date: item.date.toISOString(),
    })),
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
    })),
    kpis: [
      {
        label: "Receita do mês",
        value: revenueMonth,
        formatted: formatCurrency(revenueMonth),
        trendPercent: revenueTrend,
        trendLabel: formatPercent(revenueTrend),
      },
      {
        label: "Lucro líquido",
        value: netProfitMonth,
        formatted: formatCurrency(netProfitMonth),
        trendPercent: profitTrend,
        trendLabel: formatPercent(profitTrend),
      },
      {
        label: "Clientes ativos",
        value: activeCustomers,
        formatted: String(activeCustomers),
        trendPercent: customersTrend,
        trendLabel: formatPercent(customersTrend),
      },
      {
        label: "Novos clientes",
        value: newCustomersMonth,
        formatted: String(newCustomersMonth),
        trendPercent: newCustomersTrend,
        trendLabel: formatPercent(newCustomersTrend),
      },
    ],
    averageTicket,
    lostCustomers: 0,
    delinquencyAmount,
    profitMarginPercent,
    projectedRevenue: null,
    revenueByCategory: categoryIncome.map((item) => ({
      categoryId: item.categoryId ?? "none",
      categoryName: categoryName(item.categoryId),
      amount: item._sum.amount ? Number(item._sum.amount) : 0,
    })),
    expensesByCategory: categoryExpense.map((item) => ({
      categoryId: item.categoryId ?? "none",
      categoryName: categoryName(item.categoryId),
      amount: item._sum.amount ? Number(item._sum.amount) : 0,
    })),
    appointmentsCount: null,
    crm: {
      customersCount: crmStats.customersCount,
      overdueCustomers: crmStats.overdueCustomers,
      totalReceivable: crmStats.totalReceivable,
      formattedTotalReceivable: formatCurrency(crmStats.totalReceivable),
      receivedMonth: crmStats.receivedMonth,
      formattedReceivedMonth: formatCurrency(crmStats.receivedMonth),
      pendingInstallments: crmStats.pendingInstallments,
      paidInstallments: crmStats.paidInstallments,
      overdueInstallments: crmStats.overdueInstallments,
      topCustomerName: crmStats.topCustomerName,
      topCustomerAmount: crmStats.topCustomerAmount,
      formattedTopCustomerAmount: formatCurrency(crmStats.topCustomerAmount),
    },
  };
}

export function getDashboardCacheTag(companyId: string): string {
  return `dashboard:${companyId}`;
}

export async function getDashboardData(companyId: string): Promise<DashboardResponseDTO> {
  assertTenantId(companyId);
  const cached = unstable_cache(
    async () => loadDashboard(companyId),
    [`dashboard-${companyId}`],
    {
      tags: [getDashboardCacheTag(companyId)],
      revalidate: 60,
    },
  );
  return cached();
}
