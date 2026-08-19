import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";

export type ProfessionalReportType =
  | "GENERAL"
  | "CASHFLOW"
  | "INCOME"
  | "EXPENSE"
  | "INSTALLMENTS"
  | "CUSTOMERS"
  | "CATEGORIES"
  | "MONTHLY";

export type ProfessionalReportFilters = {
  from: string;
  to: string;
  customerId?: string;
  categoryId?: string;
  paymentMethod?: string;
  status?: string;
  type: ProfessionalReportType;
};

export type ProfessionalReportDTO = {
  title: string;
  periodLabel: string;
  summary: {
    revenue: number;
    expenses: number;
    profit: number;
    receivable: number;
    formattedRevenue: string;
    formattedExpenses: string;
    formattedProfit: string;
    formattedReceivable: string;
  };
  rows: Array<Record<string, string | number>>;
  chart: Array<{ label: string; value: number; secondary?: number }>;
};

function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateBR(value: string | Date): string {
  const iso = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PAID: "Pago",
    PENDING: "Pendente",
    OVERDUE: "Vencido",
    CANCELED: "Cancelado",
  };
  return map[status] ?? status;
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    INCOME: "Entrada",
    EXPENSE: "Saída",
    TRANSFER: "Transferência",
  };
  return map[type] ?? type;
}

function paymentLabel(method: string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    PIX: "PIX",
    CASH: "Dinheiro",
    CARD: "Cartão",
    CARD_CREDIT: "Cartão de crédito",
    CARD_DEBIT: "Cartão de débito",
    TED: "TED",
    BOLETO: "Boleto",
    OTHER: "Outro",
  };
  return map[method] ?? method;
}

function parseDateStart(value: string): Date {
  return startOfDay(new Date(`${value}T12:00:00`));
}

function parseDateEnd(value: string): Date {
  return endOfDay(new Date(`${value}T12:00:00`));
}

const TITLES: Record<ProfessionalReportType, string> = {
  GENERAL: "Financeiro Geral",
  CASHFLOW: "Fluxo de Caixa",
  INCOME: "Receitas",
  EXPENSE: "Despesas",
  INSTALLMENTS: "Parcelas",
  CUSTOMERS: "Clientes",
  CATEGORIES: "Categorias",
  MONTHLY: "Resumo Mensal",
};

export async function getProfessionalReport(
  companyId: string,
  filters: ProfessionalReportFilters,
): Promise<ProfessionalReportDTO> {
  assertTenantId(companyId);
  const from = parseDateStart(filters.from);
  const to = parseDateEnd(filters.to);

  const txWhere = {
    companyId,
    deletedAt: null as null,
    date: { gte: from, lte: to },
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.paymentMethod
      ? { paymentMethod: filters.paymentMethod as "PIX" | "CASH" | "CARD" | "CARD_CREDIT" | "CARD_DEBIT" | "TED" | "BOLETO" | "OTHER" }
      : {}),
    ...(filters.status
      ? { status: filters.status as "PENDING" | "PAID" | "OVERDUE" | "CANCELED" }
      : {}),
  };

  const [transactions, installments] = await Promise.all([
    prisma.transaction.findMany({
      where: txWhere,
      include: {
        customer: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 500,
    }),
    prisma.installment.findMany({
      where: {
        companyId,
        deletedAt: null,
        dueDate: { gte: from, lte: to },
        ...(filters.status
          ? { status: filters.status as "PENDING" | "PAID" | "OVERDUE" | "CANCELED" }
          : {}),
      },
      include: {
        sale: { select: { description: true, customer: { select: { name: true } } } },
      },
      orderBy: { dueDate: "desc" },
      take: 500,
    }),
  ]);

  const paidIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PAID")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const paidExpense = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const receivable = installments
    .filter((i) => i.status === "PENDING" || i.status === "OVERDUE")
    .reduce((acc, i) => acc + Number(i.amount), 0);

  let rows: Array<Record<string, string | number>> = [];
  let chart: Array<{ label: string; value: number; secondary?: number }> = [];

  if (filters.type === "INSTALLMENTS") {
    rows = installments.map((item) => ({
      Cliente: item.sale.customer.name,
      Descrição: item.sale.description,
      Parcela: item.number,
      Valor: money(Number(item.amount)),
      Vencimento: formatDateBR(item.dueDate),
      Status: statusLabel(item.status),
    }));
    chart = [
      {
        label: "Pagas",
        value: installments.filter((i) => i.status === "PAID").length,
      },
      {
        label: "Pendentes",
        value: installments.filter((i) => i.status === "PENDING").length,
      },
      {
        label: "Vencidas",
        value: installments.filter((i) => i.status === "OVERDUE").length,
      },
    ];
  } else if (filters.type === "CUSTOMERS") {
    const map = new Map<string, number>();
    for (const tx of transactions.filter((t) => t.type === "INCOME" && t.status === "PAID")) {
      const name = tx.customer?.name ?? "Sem cliente";
      map.set(name, (map.get(name) ?? 0) + Number(tx.amount));
    }
    rows = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([Cliente, Valor]) => ({ Cliente, Valor: money(Valor) }));
    chart = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  } else if (filters.type === "CATEGORIES") {
    const map = new Map<string, number>();
    for (const tx of transactions.filter((t) => t.status === "PAID")) {
      const name = tx.category?.name ?? "Sem categoria";
      map.set(name, (map.get(name) ?? 0) + Number(tx.amount));
    }
    rows = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([Categoria, Valor]) => ({ Categoria, Valor: money(Valor) }));
    chart = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  } else {
    const filtered =
      filters.type === "INCOME"
        ? transactions.filter((t) => t.type === "INCOME")
        : filters.type === "EXPENSE"
          ? transactions.filter((t) => t.type === "EXPENSE")
          : transactions;
    rows = filtered.map((tx) => ({
      Data: formatDateBR(tx.date),
      Tipo: typeLabel(tx.type),
      Descrição: tx.description ?? "—",
      Cliente: tx.customer?.name ?? "—",
      Categoria: tx.category?.name ?? "—",
      Valor: money(Number(tx.amount)),
      Status: statusLabel(tx.status),
      Pagamento: paymentLabel(tx.paymentMethod),
    }));
    chart = [
      { label: "Receitas", value: paidIncome },
      { label: "Despesas", value: paidExpense },
      { label: "Lucro", value: paidIncome - paidExpense },
    ];
  }

  return {
    title: TITLES[filters.type],
    periodLabel: `${formatDateBR(filters.from)} a ${formatDateBR(filters.to)}`,
    summary: {
      revenue: paidIncome,
      expenses: paidExpense,
      profit: paidIncome - paidExpense,
      receivable,
      formattedRevenue: money(paidIncome),
      formattedExpenses: money(paidExpense),
      formattedProfit: money(paidIncome - paidExpense),
      formattedReceivable: money(receivable),
    },
    rows,
    chart,
  };
}

export function reportToCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => escape(row[key] ?? "")).join(",")),
  ].join("\n");
}
