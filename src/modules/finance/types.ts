export type PaymentMethod =
  | "PIX"
  | "CASH"
  | "CARD"
  | "CARD_CREDIT"
  | "CARD_DEBIT"
  | "TED"
  | "BOLETO"
  | "OTHER";

export type MovementType = "INCOME" | "EXPENSE";

export type TransactionStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";

export type DateFilter = "hoje" | "ontem" | "semana" | "mes" | "personalizado";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CARD: "Cartão",
  CARD_CREDIT: "Cartão de crédito",
  CARD_DEBIT: "Cartão de débito",
  TED: "Transferência",
  BOLETO: "Boleto",
  OTHER: "Outro",
};

/** Options shown in create/edit forms (legacy CARD kept for old records only). */
export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "PIX",
  "CASH",
  "CARD_CREDIT",
  "CARD_DEBIT",
  "TED",
  "BOLETO",
  "OTHER",
];

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado",
};
