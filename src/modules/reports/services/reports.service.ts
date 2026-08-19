import { unstable_cache } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import { formatCurrency } from "@/modules/finance/utils";
import type {
  MonthlyReportDTO,
  ReportCategoryItem,
  ReportInsight,
} from "../dto/reports.dto";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function parseMonthKey(monthKey?: string): Date {
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function periodLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function monthShort(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}

function trend(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

function sumByType(
  rows: Array<{ type: "INCOME" | "EXPENSE" | "TRANSFER"; _sum: { amount: unknown } }>,
  type: "INCOME" | "EXPENSE",
): number {
  const row = rows.find((item) => item.type === type);
  return row?._sum.amount ? Number(row._sum.amount) : 0;
}

function mapCategories(
  rows: Array<{ categoryId: string | null; _sum: { amount: unknown } }>,
  names: Map<string, string>,
  total: number,
): ReportCategoryItem[] {
  return rows
    .map((item) => {
      const amount = item._sum.amount ? Number(item._sum.amount) : 0;
      const id = item.categoryId ?? "none";
      return {
        categoryId: id,
        categoryName: names.get(id) ?? "Sem categoria",
        amount,
        formattedAmount: formatCurrency(amount),
        sharePercent: total > 0 ? (amount / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

function buildInsights(input: {
  revenue: number;
  expenses: number;
  profit: number;
  previousRevenue: number;
  previousExpenses: number;
  monthlyGoal: number;
  goalRemaining: number;
  goalMet: boolean;
  overdueIncome: number;
  overdueCount: number;
  topExpense?: ReportCategoryItem;
  revenueTrend: number | null;
  expensesTrend: number | null;
}): ReportInsight[] {
  const insights: ReportInsight[] = [];

  if (input.monthlyGoal > 0) {
    if (input.goalMet) {
      insights.push({
        id: "goal-met",
        tone: "positive",
        title: "Meta do mês atingida",
        detail: `A receita chegou a ${formatCurrency(input.revenue)} e cobriu a meta de ${formatCurrency(input.monthlyGoal)}.`,
      });
    } else {
      insights.push({
        id: "goal-gap",
        tone: "warning",
        title: "Meta ainda não atingida",
        detail: `Faltam ${formatCurrency(input.goalRemaining)} para chegar à meta de ${formatCurrency(input.monthlyGoal)}.`,
      });
    }
  }

  if (input.overdueIncome > 0) {
    insights.push({
      id: "overdue",
      tone: "warning",
      title: "Recebíveis em atraso",
      detail: `Há ${formatCurrency(input.overdueIncome)} em ${input.overdueCount} lançamento(s) atrasado(s) — priorize a cobrança.`,
    });
  }

  if (input.expensesTrend !== null && input.expensesTrend >= 15) {
    insights.push({
      id: "expenses-up",
      tone: "warning",
      title: "Despesas subiram",
      detail: `Os gastos cresceram ${formatPercent(input.expensesTrend)} em relação ao mês anterior (${formatCurrency(input.previousExpenses)} → ${formatCurrency(input.expenses)}).`,
    });
  } else if (input.expensesTrend !== null && input.expensesTrend <= -10) {
    insights.push({
      id: "expenses-down",
      tone: "positive",
      title: "Despesas sob controle",
      detail: `Os gastos caíram ${formatPercent(Math.abs(input.expensesTrend))} vs. o mês anterior.`,
    });
  }

  if (input.revenueTrend !== null && input.revenueTrend >= 10) {
    insights.push({
      id: "revenue-up",
      tone: "positive",
      title: "Receita em alta",
      detail: `A receita cresceu ${formatPercent(input.revenueTrend)} em relação a ${formatCurrency(input.previousRevenue)}.`,
    });
  }

  if (input.topExpense && input.topExpense.amount > 0) {
    insights.push({
      id: "top-expense",
      tone: "neutral",
      title: "Maior gasto do mês",
      detail: `${input.topExpense.categoryName} concentrou ${input.topExpense.formattedAmount} (${input.topExpense.sharePercent.toFixed(0).replace(".", ",")}%).`,
    });
  }

  if (input.profit < 0) {
    insights.push({
      id: "negative-profit",
      tone: "warning",
      title: "Mês no vermelho",
      detail: `As despesas superaram a receita em ${formatCurrency(Math.abs(input.profit))}. Vale revisar categorias e pendências.`,
    });
  } else if (input.revenue > 0 && input.profit / input.revenue >= 0.3) {
    insights.push({
      id: "good-margin",
      tone: "positive",
      title: "Boa margem de lucro",
      detail: `Lucro de ${formatCurrency(input.profit)} — cerca de ${((input.profit / input.revenue) * 100).toFixed(0)}% da receita.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "neutral",
      tone: "neutral",
      title: "Sem alertas fortes neste mês",
      detail: "Continue lançando entradas e saídas para ter um diagnóstico mais rico no próximo período.",
    });
  }

  return insights.slice(0, 4);
}

async function loadMonthlyReport(
  companyId: string,
  monthKeyInput?: string,
): Promise<MonthlyReportDTO> {
  assertTenantId(companyId);

  const selected = parseMonthKey(monthKeyInput);
  const monthKey = toMonthKey(selected);
  const currentStart = startOfMonth(selected);
  const currentEnd = endOfMonth(selected);
  const previous = addMonths(selected, -1);
  const previousStart = startOfMonth(previous);
  const previousEnd = endOfMonth(previous);
  const chartStart = startOfMonth(addMonths(selected, -5));
  const now = new Date();

  const [
    currentGrouped,
    previousGrouped,
    settings,
    categoryIncome,
    categoryExpense,
    pendingAgg,
    overdueAgg,
    overdueItems,
    chartTransactions,
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
    prisma.companySettings.findUnique({ where: { companyId } }),
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
    prisma.transaction.aggregate({
      where: {
        companyId,
        deletedAt: null,
        type: "INCOME",
        status: "PENDING",
        date: { gte: currentStart, lte: currentEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        companyId,
        deletedAt: null,
        type: "INCOME",
        status: "OVERDUE",
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        type: "INCOME",
        status: { in: ["PENDING", "OVERDUE"] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: [{ status: "desc" }, { dueDate: "asc" }, { date: "asc" }],
      take: 8,
    }),
    prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: "PAID",
        date: { gte: chartStart, lte: currentEnd },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      select: { type: true, amount: true, date: true },
    }),
  ]);

  const revenue = sumByType(currentGrouped, "INCOME");
  const expenses = sumByType(currentGrouped, "EXPENSE");
  const profit = revenue - expenses;
  const previousRevenue = sumByType(previousGrouped, "INCOME");
  const previousExpenses = sumByType(previousGrouped, "EXPENSE");
  const previousProfit = previousRevenue - previousExpenses;

  const monthlyGoal = settings ? Number(settings.monthlyGoal) : 0;
  const goalProgressPercent =
    monthlyGoal > 0 ? Math.min(100, (revenue / monthlyGoal) * 100) : 0;
  const goalRemaining = Math.max(0, monthlyGoal - revenue);
  const goalMet = monthlyGoal > 0 && revenue >= monthlyGoal;

  const pendingIncome = pendingAgg._sum.amount ? Number(pendingAgg._sum.amount) : 0;
  const overdueIncome = overdueAgg._sum.amount ? Number(overdueAgg._sum.amount) : 0;
  const overdueCount = overdueAgg._count._all;

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

  const nameMap = new Map(categories.map((item) => [item.id, item.name]));
  const topIncomeCategories = mapCategories(categoryIncome, nameMap, revenue);
  const topExpenseCategories = mapCategories(categoryExpense, nameMap, expenses);

  const revenueTrendPercent = trend(revenue, previousRevenue);
  const expensesTrendPercent = trend(expenses, previousExpenses);
  const profitTrendPercent = trend(profit, previousProfit);

  const comparison = Array.from({ length: 6 }).map((_, index) => {
    const monthDate = addMonths(chartStart, index);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const inMonth = chartTransactions.filter(
      (item) => item.date >= start && item.date <= end,
    );
    const monthRevenue = inMonth
      .filter((item) => item.type === "INCOME")
      .reduce((acc, item) => acc + Number(item.amount), 0);
    const monthExpenses = inMonth
      .filter((item) => item.type === "EXPENSE")
      .reduce((acc, item) => acc + Number(item.amount), 0);
    return {
      month: monthShort(monthDate),
      monthKey: toMonthKey(monthDate),
      revenue: monthRevenue,
      expenses: monthExpenses,
      profit: monthRevenue - monthExpenses,
    };
  });

  const insights = buildInsights({
    revenue,
    expenses,
    profit,
    previousRevenue,
    previousExpenses,
    monthlyGoal,
    goalRemaining,
    goalMet,
    overdueIncome,
    overdueCount,
    topExpense: topExpenseCategories[0],
    revenueTrend: revenueTrendPercent,
    expensesTrend: expensesTrendPercent,
  });

  return {
    companyId,
    generatedAt: now.toISOString(),
    monthKey,
    periodLabel: periodLabel(selected),
    previousPeriodLabel: periodLabel(previous),
    revenue,
    expenses,
    profit,
    formattedRevenue: formatCurrency(revenue),
    formattedExpenses: formatCurrency(expenses),
    formattedProfit: formatCurrency(profit),
    previousRevenue,
    previousExpenses,
    previousProfit,
    revenueTrendPercent,
    expensesTrendPercent,
    profitTrendPercent,
    revenueTrendLabel: formatPercent(revenueTrendPercent),
    expensesTrendLabel: formatPercent(expensesTrendPercent),
    profitTrendLabel: formatPercent(profitTrendPercent),
    monthlyGoal,
    formattedMonthlyGoal: formatCurrency(monthlyGoal),
    goalProgressPercent,
    goalRemaining,
    formattedGoalRemaining: formatCurrency(goalRemaining),
    goalMet,
    pendingIncome,
    overdueIncome,
    formattedPendingIncome: formatCurrency(pendingIncome),
    formattedOverdueIncome: formatCurrency(overdueIncome),
    overdueCount,
    topIncomeCategories,
    topExpenseCategories,
    overdueItems: overdueItems.map((item) => ({
      id: item.id,
      description: item.description ?? "Recebível",
      customerName: item.customer?.name ?? null,
      amount: Number(item.amount),
      formattedAmount: formatCurrency(Number(item.amount)),
      status: item.status as "PENDING" | "OVERDUE",
      dueDate: item.dueDate?.toISOString() ?? null,
      date: item.date.toISOString(),
    })),
    insights,
    comparison,
  };
}

export function getReportsCacheTag(companyId: string): string {
  return `reports:${companyId}`;
}

export async function getMonthlyReportData(
  companyId: string,
  monthKey?: string,
): Promise<MonthlyReportDTO> {
  assertTenantId(companyId);
  const key = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : toMonthKey(new Date());
  const cached = unstable_cache(
    async () => loadMonthlyReport(companyId, key),
    [`reports-${companyId}-${key}`],
    {
      tags: [getReportsCacheTag(companyId)],
      revalidate: 60,
    },
  );
  return cached();
}
