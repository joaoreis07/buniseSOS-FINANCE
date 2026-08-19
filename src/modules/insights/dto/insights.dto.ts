export type HealthStatus = "EXCELLENT" | "GOOD" | "ATTENTION" | "CRITICAL";

export type InsightTone = "positive" | "warning" | "neutral";

export type InsightMessage = {
  id: string;
  tone: InsightTone;
  text: string;
};

export type InsightsOverviewDTO = {
  companyId: string;
  generatedAt: string;
  periodLabel: string;
  score: number;
  status: HealthStatus;
  statusLabel: string;
  indicators: {
    revenueMonth: number;
    expensesMonth: number;
    profitMonth: number;
    cashFlow: number;
    projectedIncome: number;
    projectedExpense: number;
    activeCustomers: number;
    delinquentCustomers: number;
    openInstallments: number;
    amountReceivable: number;
    amountPayable: number;
    formatted: Record<
      | "revenueMonth"
      | "expensesMonth"
      | "profitMonth"
      | "cashFlow"
      | "projectedIncome"
      | "projectedExpense"
      | "amountReceivable"
      | "amountPayable",
      string
    >;
  };
  charts: {
    revenueVsExpenses: Array<{ month: string; revenue: number; expenses: number }>;
    monthlyFlow: Array<{ month: string; flow: number }>;
    categories: Array<{ name: string; amount: number; type: "INCOME" | "EXPENSE" }>;
    revenueEvolution: Array<{ month: string; revenue: number }>;
    topCustomers: Array<{ name: string; amount: number }>;
    receiptsByMonth: Array<{ month: string; amount: number }>;
  };
  insights: InsightMessage[];
};
