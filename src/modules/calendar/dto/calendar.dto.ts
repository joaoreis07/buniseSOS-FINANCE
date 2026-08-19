export type CalendarEventType =
  | "INCOME"
  | "EXPENSE"
  | "RECEIPT"
  | "DUE"
  | "OVERDUE"
  | "PARTIAL"
  | "META";

export type CalendarEventDTO = {
  id: string;
  type: CalendarEventType;
  title: string;
  description: string | null;
  amount: number;
  formattedAmount: string;
  /** Remaining balance for installments (same as amount when not partial). */
  amountRemaining: number;
  formattedAmountRemaining: string;
  amountPaid: number;
  formattedAmountPaid: string;
  originalAmount: number;
  formattedOriginalAmount: string;
  isPartial: boolean;
  date: string;
  status: string | null;
  statusLabel: string;
  paymentMethod: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  categoryId: string | null;
  categoryName: string | null;
  notes: string | null;
  source: "TRANSACTION" | "INSTALLMENT" | "META";
  sourceId: string;
  color: string;
};

export type OverdueCustomerDTO = {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  installmentsCount: number;
  totalAmount: number;
  formattedTotalAmount: string;
  oldestDueDate: string;
  oldestDueDateLabel: string;
  events: CalendarEventDTO[];
};

export type CalendarOverviewDTO = {
  events: CalendarEventDTO[];
  rangeStart: string;
  rangeEnd: string;
  summary: {
    overdueTotal: number;
    overdueCount: number;
    dueTodayTotal: number;
    dueTodayCount: number;
    dueThisWeekTotal: number;
    dueThisWeekCount: number;
    projectedIncome: number;
    projectedExpense: number;
    formattedOverdueTotal: string;
    formattedDueTodayTotal: string;
    formattedDueThisWeekTotal: string;
    formattedProjectedIncome: string;
    formattedProjectedExpense: string;
  };
  sidebar: {
    today: CalendarEventDTO[];
    upcomingDue: CalendarEventDTO[];
    overdueInstallments: CalendarEventDTO[];
    overdueCustomers: OverdueCustomerDTO[];
    partialInstallments: CalendarEventDTO[];
  };
};

export const EVENT_COLORS: Record<CalendarEventType, string> = {
  INCOME: "#059669",
  EXPENSE: "#e11d48",
  RECEIPT: "#0284c7",
  DUE: "#ea580c",
  OVERDUE: "#b91c1c",
  PARTIAL: "#ca8a04",
  META: "#7c3aed",
};

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  INCOME: "A receber",
  EXPENSE: "A pagar",
  RECEIPT: "Recebido",
  DUE: "Parcela a vencer",
  OVERDUE: "Parcela atrasada",
  PARTIAL: "Parcela parcial (ainda falta)",
  META: "Meta do mês",
};
