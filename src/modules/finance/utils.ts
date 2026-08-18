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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateBR(isoDate: string): string {
  const dateOnly = isoDate.slice(0, 10);
  return format(parseISO(dateOnly), "dd/MM/yyyy");
}

export function formatLongDate(isoDate: string): string {
  const dateOnly = isoDate.slice(0, 10);
  return format(parseISO(dateOnly), "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function paymentBadgeClass(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    PIX: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CASH: "border-amber-200 bg-amber-50 text-amber-700",
    CARD: "border-violet-200 bg-violet-50 text-violet-700",
    CARD_CREDIT: "border-violet-200 bg-violet-50 text-violet-700",
    CARD_DEBIT: "border-indigo-200 bg-indigo-50 text-indigo-700",
    TED: "border-sky-200 bg-sky-50 text-sky-700",
    BOLETO: "border-blue-200 bg-blue-50 text-blue-700",
    OTHER: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return map[method];
}

export function getFilterRange(
  filter: DateFilter,
  customFrom?: string,
  customTo?: string,
  todayIso?: string,
  /** First day of the visible month (YYYY-MM-DD). Used when filter is `mes`. */
  viewMonthIso?: string,
): { from: Date; to: Date } | null {
  const today = parseISO(todayIso ?? new Date().toISOString().slice(0, 10));

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
    case "mes": {
      const monthAnchor = viewMonthIso
        ? parseISO(viewMonthIso.slice(0, 10))
        : today;
      return { from: startOfMonth(monthAnchor), to: endOfMonth(monthAnchor) };
    }
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
  todayIso?: string,
  viewMonthIso?: string,
): boolean {
  const range = getFilterRange(filter, customFrom, customTo, todayIso, viewMonthIso);
  if (!range) return true;
  const d = parseISO(isoDate.slice(0, 10));
  if (isSameDay(range.from, range.to)) return isSameDay(d, range.from);
  return isWithinInterval(d, { start: range.from, end: range.to });
}

/** YYYY-MM-01 for the month containing `isoDate`. */
export function toMonthStartIso(isoDate: string): string {
  const d = parseISO(isoDate.slice(0, 10));
  return format(startOfMonth(d), "yyyy-MM-dd");
}

export function formatMonthYear(isoDate: string): string {
  const d = parseISO(isoDate.slice(0, 10));
  const label = format(d, "MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
