import { addMonths, endOfMonth, startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import type { HealthStatus, InsightMessage, InsightsOverviewDTO } from "../dto/insights.dto";

function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function monthShort(date: Date): string {
  return format(date, "MMM", { locale: ptBR }).replace(".", "");
}

function statusFromScore(score: number): { status: HealthStatus; statusLabel: string } {
  if (score >= 85) return { status: "EXCELLENT", statusLabel: "Excelente" };
  if (score >= 65) return { status: "GOOD", statusLabel: "Boa" };
  if (score >= 40) return { status: "ATTENTION", statusLabel: "Atenção" };
  return { status: "CRITICAL", statusLabel: "Crítica" };
}

function computeScore(input: {
  cashFlowPositive: boolean;
  revenueGtExpenses: boolean;
  overdueCount: number;
  goalMet: boolean;
  goalProgress: number;
  revenueGrowth: number | null;
}): number {
  let score = 50;
  if (input.cashFlowPositive) score += 15;
  else score -= 15;
  if (input.revenueGtExpenses) score += 15;
  else score -= 10;
  if (input.overdueCount === 0) score += 15;
  else if (input.overdueCount <= 3) score -= 5;
  else score -= 15;
  if (input.goalMet) score += 10;
  else if (input.goalProgress >= 0.7) score += 5;
  if (input.revenueGrowth !== null) {
    if (input.revenueGrowth >= 10) score += 10;
    else if (input.revenueGrowth >= 0) score += 5;
    else if (input.revenueGrowth <= -15) score -= 15;
    else score -= 5;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getInsightsOverview(companyId: string): Promise<InsightsOverviewDTO> {
  assertTenantId(companyId);
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousStart = startOfMonth(addMonths(now, -1));
  const previousEnd = endOfMonth(addMonths(now, -1));
  const chartStart = startOfMonth(addMonths(now, -5));

  const [
    currentPaid,
    previousPaid,
    allPaid,
    pendingIncome,
    pendingExpense,
    overdueInstallments,
    openInstallments,
    settings,
    chartTx,
    categoryRows,
    topSales,
    activeCustomers,
    delinquentGroups,
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
      where: { companyId, deletedAt: null, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        companyId,
        deletedAt: null,
        type: "INCOME",
        status: { in: ["PENDING", "OVERDUE"] },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        companyId,
        deletedAt: null,
        type: "EXPENSE",
        status: { in: ["PENDING", "OVERDUE"] },
      },
      _sum: { amount: true },
    }),
    prisma.installment.count({
      where: { companyId, deletedAt: null, status: "OVERDUE" },
    }),
    prisma.installment.count({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["PENDING", "OVERDUE"] },
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
      select: { type: true, amount: true, date: true, customerId: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        date: { gte: currentStart, lte: currentEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { companyId, deletedAt: null },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    }),
    prisma.customer.count({
      where: { companyId, deletedAt: null, status: "ACTIVE" },
    }),
    prisma.installment.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      select: { sale: { select: { customerId: true } } },
    }),
  ]);

  const sumType = (
    rows: Array<{ type: string; _sum: { amount: unknown } }>,
    type: string,
  ) => Number(rows.find((r) => r.type === type)?._sum.amount ?? 0);

  const revenueMonth = sumType(currentPaid, "INCOME");
  const expensesMonth = sumType(currentPaid, "EXPENSE");
  const profitMonth = revenueMonth - expensesMonth;
  const cashFlow = sumType(allPaid, "INCOME") - sumType(allPaid, "EXPENSE");
  const previousRevenue = sumType(previousPaid, "INCOME");
  const previousExpenses = sumType(previousPaid, "EXPENSE");
  const projectedIncome = Number(pendingIncome._sum.amount ?? 0);
  const projectedExpense = Number(pendingExpense._sum.amount ?? 0);
  const amountReceivable = projectedIncome;
  const amountPayable = projectedExpense;
  const monthlyGoal = Number(settings?.monthlyGoal ?? 0);
  const goalProgress = monthlyGoal > 0 ? revenueMonth / monthlyGoal : 0;
  const goalMet = monthlyGoal > 0 && revenueMonth >= monthlyGoal;
  const revenueGrowth =
    previousRevenue > 0 ? ((revenueMonth - previousRevenue) / previousRevenue) * 100 : null;

  const delinquentCustomers = new Set(
    delinquentGroups.map((item) => item.sale.customerId),
  ).size;

  const score = computeScore({
    cashFlowPositive: cashFlow >= 0,
    revenueGtExpenses: revenueMonth >= expensesMonth,
    overdueCount: overdueInstallments,
    goalMet,
    goalProgress,
    revenueGrowth,
  });
  const { status, statusLabel } = statusFromScore(score);

  const revenueVsExpenses = Array.from({ length: 6 }).map((_, index) => {
    const monthDate = addMonths(chartStart, index);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const inMonth = chartTx.filter((t) => t.date >= start && t.date <= end);
    const revenue = inMonth
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => acc + Number(t.amount), 0);
    const expenses = inMonth
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => acc + Number(t.amount), 0);
    return { month: monthShort(monthDate), revenue, expenses };
  });

  const monthlyFlow = revenueVsExpenses.map((item) => ({
    month: item.month,
    flow: item.revenue - item.expenses,
  }));

  const revenueEvolution = revenueVsExpenses.map((item) => ({
    month: item.month,
    revenue: item.revenue,
  }));

  const receiptsByMonth = revenueEvolution.map((item) => ({
    month: item.month,
    amount: item.revenue,
  }));

  const categoryIds = categoryRows
    .map((row) => row.categoryId)
    .filter((id): id is string => Boolean(id));
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, companyId, deletedAt: null },
    select: { id: true, name: true },
  });
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const categoryChart = categoryRows
    .map((row) => ({
      name: categoryName.get(row.categoryId ?? "") ?? "Sem categoria",
      amount: Number(row._sum.amount ?? 0),
      type: row.type as "INCOME" | "EXPENSE",
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const customerIds = topSales.map((s) => s.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds }, companyId },
    select: { id: true, name: true },
  });
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  const topCustomers = topSales.map((s) => ({
    name: customerName.get(s.customerId) ?? "Cliente",
    amount: Number(s._sum.totalAmount ?? 0),
  }));

  const insights: InsightMessage[] = [];
  if (revenueGrowth !== null) {
    if (revenueGrowth >= 0) {
      insights.push({
        id: "rev-up",
        tone: "positive",
        text: `Receita cresceu ${revenueGrowth.toFixed(0).replace(".", ",")}% vs. mês anterior`,
      });
    } else {
      insights.push({
        id: "rev-down",
        tone: "warning",
        text: `Receita caiu ${Math.abs(revenueGrowth).toFixed(0).replace(".", ",")}% vs. mês anterior`,
      });
    }
  }
  if (cashFlow >= 0) {
    insights.push({
      id: "flow-ok",
      tone: "positive",
      text: "Fluxo permanece positivo",
    });
  } else {
    insights.push({
      id: "flow-neg",
      tone: "warning",
      text: "Fluxo de caixa está negativo",
    });
  }
  if (overdueInstallments > 0) {
    insights.push({
      id: "overdue",
      tone: "warning",
      text: `Existem ${overdueInstallments} parcela(s) vencida(s)`,
    });
  }
  if (expensesMonth > previousExpenses && previousExpenses > 0) {
    insights.push({
      id: "exp-up",
      tone: "warning",
      text: "Sua despesa aumentou este mês",
    });
  }
  if (goalMet) {
    insights.push({ id: "goal", tone: "positive", text: "Meta atingida" });
  } else if (monthlyGoal > 0 && goalProgress >= 0.8) {
    insights.push({
      id: "goal-near",
      tone: "neutral",
      text: "Meta quase atingida — continue no ritmo",
    });
  }
  if (insights.length === 0) {
    insights.push({
      id: "neutral",
      tone: "neutral",
      text: "Continue registrando lançamentos para gerar mais insights",
    });
  }

  return {
    companyId,
    generatedAt: now.toISOString(),
    periodLabel: format(now, "MMMM yyyy", { locale: ptBR }),
    score,
    status,
    statusLabel,
    indicators: {
      revenueMonth,
      expensesMonth,
      profitMonth,
      cashFlow,
      projectedIncome,
      projectedExpense,
      activeCustomers,
      delinquentCustomers,
      openInstallments,
      amountReceivable,
      amountPayable,
      formatted: {
        revenueMonth: money(revenueMonth),
        expensesMonth: money(expensesMonth),
        profitMonth: money(profitMonth),
        cashFlow: money(cashFlow),
        projectedIncome: money(projectedIncome),
        projectedExpense: money(projectedExpense),
        amountReceivable: money(amountReceivable),
        amountPayable: money(amountPayable),
      },
    },
    charts: {
      revenueVsExpenses,
      monthlyFlow,
      categories: categoryChart,
      revenueEvolution,
      topCustomers,
      receiptsByMonth,
    },
    insights,
  };
}
