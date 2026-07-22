export type DashboardKpi = {
  label: string;
  value: number;
  formatted: string;
  trendPercent: number | null;
  trendLabel: string;
};

export type DashboardChartPoint = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export type DashboardMovement = {
  id: string;
  customerName: string | null;
  description: string;
  amount: number;
  formattedAmount: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string;
};

export type DashboardNotificationItem = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type DashboardCategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  amount: number;
};

/**
 * Extensible dashboard contract.
 * Fields with null/0 are reserved for future stages without UI refactor.
 */
export type DashboardResponseDTO = {
  companyId: string;
  generatedAt: string;
  periodLabel: string;

  // Implemented with real data in Stage 5
  revenueMonth: number;
  expensesMonth: number;
  netProfitMonth: number;
  currentBalance: number;
  activeCustomers: number;
  newCustomersMonth: number;
  monthlyGoal: number;
  goalProgressPercent: number;
  monthlyComparison: DashboardChartPoint[];
  recentMovements: DashboardMovement[];
  notifications: DashboardNotificationItem[];
  kpis: DashboardKpi[];

  // Prepared for growth (computed simply or null placeholders)
  averageTicket: number;
  lostCustomers: number;
  delinquencyAmount: number;
  profitMarginPercent: number;
  projectedRevenue: number | null;
  revenueByCategory: DashboardCategoryBreakdown[];
  expensesByCategory: DashboardCategoryBreakdown[];
  appointmentsCount: number | null;
};
