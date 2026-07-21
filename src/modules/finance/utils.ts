import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateFilter, PaymentMethod } from "./types";
import { TODAY } from "./data";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateBR(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

export function formatLongDate(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function paymentBadgeClass(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    PIX: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Dinheiro: "border-amber-200 bg-amber-50 text-amber-700",
    "Cartão de Crédito": "border-violet-200 bg-violet-50 text-violet-700",
    "Cartão de Débito": "border-blue-200 bg-blue-50 text-blue-700",
    Transferência: "border-sky-200 bg-sky-50 text-sky-700",
  };
  return map[method];
}

export function getFilterRange(
  filter: DateFilter,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } | null {
  const today = parseISO(TODAY);

  switch (filter) {
    case "hoje":
      return { from: today, to: today };
    case "ontem": {
      const y = subDays(today, 1);
      return { from: y, to: y };
    }
    case "semana":
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      };
    case "mes":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "personalizado":
      if (!customFrom || !customTo) return null;
      return { from: parseISO(customFrom), to: parseISO(customTo) };
    default:
      return { from: today, to: today };
  }
}

export function isInFilterRange(
  isoDate: string,
  filter: DateFilter,
  customFrom?: string,
  customTo?: string,
): boolean {
  const range = getFilterRange(filter, customFrom, customTo);
  if (!range) return true;
  const d = parseISO(isoDate);
  if (isSameDay(range.from, range.to)) return isSameDay(d, range.from);
  return isWithinInterval(d, { start: range.from, end: range.to });
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
