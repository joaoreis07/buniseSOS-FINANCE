export type ReportCategoryItem = {
  categoryId: string;
  categoryName: string;
  amount: number;
  formattedAmount: string;
  sharePercent: number;
};

export type ReportOverdueItem = {
  id: string;
  description: string;
  customerName: string | null;
  amount: number;
  formattedAmount: string;
  status: "PENDING" | "OVERDUE";
  dueDate: string | null;
  date: string;
};

export type ReportInsight = {
  id: string;
  tone: "positive" | "warning" | "neutral";
  title: string;
  detail: string;
};

export type MonthlyReportDTO = {
  companyId: string;
  generatedAt: string;
  /** YYYY-MM */
  monthKey: string;
  periodLabel: string;
  previousPeriodLabel: string;

  revenue: number;
  expenses: number;
  profit: number;
  formattedRevenue: string;
  formattedExpenses: string;
  formattedProfit: string;

  previousRevenue: number;
  previousExpenses: number;
  previousProfit: number;
  revenueTrendPercent: number | null;
  expensesTrendPercent: number | null;
  profitTrendPercent: number | null;
  revenueTrendLabel: string;
  expensesTrendLabel: string;
  profitTrendLabel: string;

  monthlyGoal: number;
  formattedMonthlyGoal: string;
  goalProgressPercent: number;
  goalRemaining: number;
  formattedGoalRemaining: string;
  goalMet: boolean;

  pendingIncome: number;
  overdueIncome: number;
  formattedPendingIncome: string;
  formattedOverdueIncome: string;
  overdueCount: number;

  topIncomeCategories: ReportCategoryItem[];
  topExpenseCategories: ReportCategoryItem[];
  overdueItems: ReportOverdueItem[];
  insights: ReportInsight[];

  /** Last 6 months including selected month — for mini chart */
  comparison: Array<{
    month: string;
    monthKey: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
};
