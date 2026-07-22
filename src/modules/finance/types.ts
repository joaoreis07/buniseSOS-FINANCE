export type PaymentMethod = "PIX" | "CASH" | "CARD" | "TED" | "BOLETO";

export type MovementType = "INCOME" | "EXPENSE";

export type TransactionStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";

export type DateFilter = "hoje" | "ontem" | "semana" | "mes" | "personalizado";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CARD: "Cartão",
  TED: "Transferência",
  BOLETO: "Boleto",
};

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado",
};
