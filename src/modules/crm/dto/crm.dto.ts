import { formatCurrency } from "@/modules/finance/utils";
import { diffCivilDays, dueCivilDateKey, todayCivilDateKey } from "../lib/civil-date";

export type FinancialCustomerStatus = "UP_TO_DATE" | "HAS_PENDING" | "OVERDUE";

export type CreateSaleInput = {
  customerId: string;
  description: string;
  categoryId?: string | null;
  totalAmount: number;
  paymentMethod: "PIX" | "CASH" | "CARD" | "CARD_CREDIT" | "CARD_DEBIT" | "TED" | "BOLETO" | "OTHER";
  paymentMode: "CASH" | "INSTALLMENT";
  cashStatus?: "PAID" | "PENDING";
  installmentsCount?: number;
  firstDueDate?: string;
  period?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";
  customPeriodDays?: number;
  notes?: string | null;
  soldAt?: string;
};

export type ReceiveInstallmentInput = {
  installmentId: string;
  amount: number;
  paidAt: string;
  paymentMethod: "PIX" | "CASH" | "CARD" | "CARD_CREDIT" | "CARD_DEBIT" | "TED" | "BOLETO" | "OTHER";
  notes?: string | null;
};

export type UpdateSaleInput = {
  id: string;
  description: string;
  categoryId?: string | null;
  totalAmount: number;
  paymentMethod: "PIX" | "CASH" | "CARD" | "CARD_CREDIT" | "CARD_DEBIT" | "TED" | "BOLETO" | "OTHER";
  soldAt: string;
  notes?: string | null;
};

export type UpdateInstallmentInput = {
  id: string;
  amount: number;
  dueDate: string;
  notes?: string | null;
};

export type SaleDTO = {
  id: string;
  customerId: string;
  customerName: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  totalAmount: number;
  formattedTotalAmount: string;
  paymentMethod: string;
  paymentMode: "CASH" | "INSTALLMENT";
  installmentsCount: number;
  soldAt: string;
  notes: string | null;
};

export type InstallmentDTO = {
  id: string;
  saleId: string;
  saleDescription: string;
  customerId: string;
  customerName: string;
  number: number;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  formattedAmount: string;
  formattedAmountPaid: string;
  formattedAmountRemaining: string;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  isPartial: boolean;
  paidAt: string | null;
  paymentMethod: string | null;
  notes: string | null;
};

export type CustomerCrmSummaryDTO = {
  totalPurchased: number;
  totalPaid: number;
  balanceDue: number;
  salesCount: number;
  paidInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
  lastPurchaseAt: string | null;
  financialStatus: FinancialCustomerStatus;
  formattedTotalPurchased: string;
  formattedTotalPaid: string;
  formattedBalanceDue: string;
};

export type CustomerListCrmItemDTO = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  totalPurchased: number;
  totalPaid: number;
  balanceDue: number;
  lastPurchaseAt: string | null;
  financialStatus: FinancialCustomerStatus;
  formattedTotalPurchased: string;
  formattedTotalPaid: string;
  formattedBalanceDue: string;
};

export type TimelineItemDTO = {
  id: string;
  type: "SALE_CREATED" | "INSTALLMENT_CREATED" | "INSTALLMENT_PAID" | "NOTE";
  title: string;
  detail: string;
  at: string;
};

export type InstallmentPaymentHistoryDTO = {
  id: string;
  installmentId: string;
  installmentNumber: number;
  saleDescription: string;
  amount: number;
  formattedAmount: string;
  paidAt: string;
  paymentMethod: string | null;
  notes: string | null;
};

/** Pending installments due within this many days are shown under "Próximas". */
export const UPCOMING_INSTALLMENT_DAYS = 30;

export type BoardInstallmentDTO = InstallmentDTO & {
  daysOverdue: number | null;
  daysUntilDue: number | null;
};

export type InstallmentHighlightKind = "NEXT" | "OVERDUE" | "NONE";

export type CustomerInstallmentsBoardDTO = {
  overdue: BoardInstallmentDTO[];
  upcoming: BoardInstallmentDTO[];
  pending: BoardInstallmentDTO[];
  paid: BoardInstallmentDTO[];
  highlightKind: InstallmentHighlightKind;
  highlight: BoardInstallmentDTO | null;
};

export type CustomerCrmDetailDTO = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    document: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    notes: string | null;
  };
  summary: CustomerCrmSummaryDTO;
  sales: SaleDTO[];
  installments: InstallmentDTO[];
  installmentBoard: CustomerInstallmentsBoardDTO;
  payments: InstallmentPaymentHistoryDTO[];
  timeline: TimelineItemDTO[];
  notes: string | null;
};

export type ReceivablesOverviewDTO = {
  items: InstallmentDTO[];
  totalReceivable: number;
  totalReceived: number;
  totalOverdue: number;
  formattedTotalReceivable: string;
  formattedTotalReceived: string;
  formattedTotalOverdue: string;
  yearMonth: string;
  periodLabel: string;
};

export function money(value: number) {
  return {
    amount: value,
    formatted: formatCurrency(value),
  };
}

export function computeFinancialStatus(input: {
  overdue: number;
  pending: number;
}): FinancialCustomerStatus {
  if (input.overdue > 0) return "OVERDUE";
  if (input.pending > 0) return "HAS_PENDING";
  return "UP_TO_DATE";
}

function isFullyPaid(item: InstallmentDTO): boolean {
  return item.status === "PAID" || item.amountRemaining <= 0;
}

function toBoardItem(item: InstallmentDTO, todayKey: string): BoardInstallmentDTO {
  const dueKey = dueCivilDateKey(item.dueDate);
  const paid = isFullyPaid(item);
  const canceled = item.status === "CANCELED";
  const delta = diffCivilDays(todayKey, dueKey);
  const overdue = !paid && !canceled && delta < 0;
  const daysOverdue = overdue ? Math.max(1, -delta) : null;
  const daysUntilDue = !paid && !canceled && !overdue ? delta : null;
  return { ...item, daysOverdue, daysUntilDue };
}

function byDueDateAsc(a: InstallmentDTO, b: InstallmentDTO): number {
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

/**
 * Groups existing installments for the customer sheet. Does not create data —
 * it only classifies the same InstallmentDTO list.
 */
export function buildCustomerInstallmentsBoard(
  installments: InstallmentDTO[],
  now: Date = new Date(),
): CustomerInstallmentsBoardDTO {
  const todayKey = todayCivilDateKey(now);
  const overdue: BoardInstallmentDTO[] = [];
  const upcoming: BoardInstallmentDTO[] = [];
  const pending: BoardInstallmentDTO[] = [];
  const paid: BoardInstallmentDTO[] = [];

  for (const item of installments) {
    if (item.status === "CANCELED") continue;
    const boardItem = toBoardItem(item, todayKey);
    if (isFullyPaid(item)) {
      paid.push(boardItem);
      continue;
    }
    if (boardItem.daysOverdue != null) {
      overdue.push(boardItem);
      continue;
    }
    if ((boardItem.daysUntilDue ?? Number.POSITIVE_INFINITY) <= UPCOMING_INSTALLMENT_DAYS) {
      upcoming.push(boardItem);
      continue;
    }
    pending.push(boardItem);
  }

  overdue.sort(byDueDateAsc);
  upcoming.sort(byDueDateAsc);
  pending.sort(byDueDateAsc);
  paid.sort((a, b) => {
    const aPaid = a.paidAt ? new Date(a.paidAt).getTime() : 0;
    const bPaid = b.paidAt ? new Date(b.paidAt).getTime() : 0;
    return bPaid - aPaid;
  });

  const next = [...upcoming, ...pending].sort(byDueDateAsc)[0] ?? null;
  const upcomingRest = next ? upcoming.filter((item) => item.id !== next.id) : upcoming;
  const pendingRest = next ? pending.filter((item) => item.id !== next.id) : pending;

  if (next) {
    return {
      overdue,
      upcoming: upcomingRest,
      pending: pendingRest,
      paid,
      highlightKind: "NEXT",
      highlight: next,
    };
  }

  if (overdue.length > 0) {
    return {
      overdue,
      upcoming: upcomingRest,
      pending: pendingRest,
      paid,
      highlightKind: "OVERDUE",
      highlight: overdue[0],
    };
  }

  return {
    overdue,
    upcoming: upcomingRest,
    pending: pendingRest,
    paid,
    highlightKind: "NONE",
    highlight: null,
  };
}
