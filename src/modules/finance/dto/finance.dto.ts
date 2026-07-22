export type CreateCategoryDTO = {
  name: string;
  type: "INCOME" | "EXPENSE";
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
};

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

export type CategoryResponseDTO = {
  id: string;
  companyId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  color: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTransactionDTO = {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paymentMethod?: "PIX" | "CASH" | "CARD" | "TED" | "BOLETO" | null;
  amount: number;
  description?: string | null;
  notes?: string | null;
  date: Date;
  dueDate?: Date | null;
  paidAt?: Date | null;
  categoryId?: string | null;
  customerId?: string | null;
};

export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

export type TransactionResponseDTO = {
  id: string;
  companyId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paymentMethod: "PIX" | "CASH" | "CARD" | "TED" | "BOLETO" | null;
  amount: number;
  description: string | null;
  notes: string | null;
  date: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  categoryId: string | null;
  customerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoryName?: string | null;
  customerName?: string | null;
};

export type TransactionListParams = {
  type?: "INCOME" | "EXPENSE" | "TRANSFER";
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  search?: string;
  customerId?: string;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

export type CategoryClientDTO = Omit<CategoryResponseDTO, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type TransactionClientDTO = {
  id: string;
  companyId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paymentMethod: "PIX" | "CASH" | "CARD" | "TED" | "BOLETO" | null;
  amount: number;
  formattedAmount: string;
  description: string | null;
  notes: string | null;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
  categoryId: string | null;
  categoryName: string | null;
  customerId: string | null;
  customerName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CashFlowSummaryDTO = {
  incomePaid: number;
  expensePaid: number;
  balance: number;
  pendingIncome: number;
  overdueIncome: number;
  transactionCount: number;
};

export type FinanceOverviewDTO = {
  transactions: TransactionClientDTO[];
  total: number;
  categories: CategoryClientDTO[];
  cashFlow: CashFlowSummaryDTO;
  todayIncome: number;
  todayExpense: number;
  todayCount: number;
};

export type FinanceCustomerOption = {
  id: string;
  name: string;
};
