export type PaymentMethod =
  | "PIX"
  | "Dinheiro"
  | "Cartão de Crédito"
  | "Cartão de Débito"
  | "Transferência";

export type MovementType = "entrada" | "saida";

export type DateFilter =
  | "hoje"
  | "ontem"
  | "semana"
  | "mes"
  | "personalizado";

export interface FinanceMovement {
  id: string;
  type: MovementType;
  personName: string;
  description: string;
  paymentMethod: PaymentMethod;
  responsible: string;
  amount: number;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:mm
  notes?: string;
}

export interface MovementFormData {
  type: MovementType;
  personName: string;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  responsible: string;
  date: string;
  time: string;
  notes: string;
}
