export type CreateCustomerDTO = {
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
};

export type UpdateCustomerDTO = Partial<CreateCustomerDTO>;

export type CustomerResponseDTO = {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerListParams = {
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  page?: number;
  pageSize?: number;
};

export type CustomerHistoryItemDTO = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paymentMethod: "PIX" | "CASH" | "CARD" | "CARD_CREDIT" | "CARD_DEBIT" | "TED" | "BOLETO" | "OTHER" | null;
  amount: number;
  formattedAmount: string;
  description: string | null;
  date: string;
  dueDate: string | null;
};

export type CustomerFinancialSummaryDTO = {
  incomePaid: number;
  expensePaid: number;
  balance: number;
  pendingIncome: number;
  transactionCount: number;
};

export type CustomerDetailDTO = {
  customer: CustomerResponseDTO;
  history: CustomerHistoryItemDTO[];
  summary: CustomerFinancialSummaryDTO;
};

/** JSON-safe customer for client components / API */
export type CustomerClientDTO = Omit<CustomerResponseDTO, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type CustomerDetailClientDTO = {
  customer: CustomerClientDTO;
  history: CustomerHistoryItemDTO[];
  summary: CustomerFinancialSummaryDTO;
};
