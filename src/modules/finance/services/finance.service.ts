import { revalidateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import { PrismaAuditLogRepository } from "@/shared/repositories/prisma-repositories";
import { getDashboardCacheTag } from "@/modules/dashboard/services/dashboard.service";
import type {
  CashFlowSummaryDTO,
  CategoryClientDTO,
  CategoryResponseDTO,
  CreateCategoryDTO,
  CreateTransactionDTO,
  FinanceOverviewDTO,
  TransactionClientDTO,
  TransactionListParams,
  TransactionResponseDTO,
  UpdateCategoryDTO,
  UpdateTransactionDTO,
} from "../dto/finance.dto";
import {
  PrismaCategoryRepository,
  PrismaTransactionRepository,
} from "../repositories/prisma-finance.repository";

const categories = new PrismaCategoryRepository();
const transactions = new PrismaTransactionRepository();
const auditLogs = new PrismaAuditLogRepository();

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getFinanceCacheTag(companyId: string): string {
  return `finance:${companyId}`;
}

function invalidateFinanceCaches(companyId: string): void {
  try {
    revalidateTag(getFinanceCacheTag(companyId));
    revalidateTag(getDashboardCacheTag(companyId));
  } catch {
    // Outside Next.js request context (scripts/tests), skip cache invalidation.
  }
}

export function toCategoryClientDTO(category: CategoryResponseDTO): CategoryClientDTO {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function toTransactionClientDTO(
  transaction: TransactionResponseDTO,
): TransactionClientDTO {
  return {
    id: transaction.id,
    companyId: transaction.companyId,
    type: transaction.type,
    status: transaction.status,
    paymentMethod: transaction.paymentMethod,
    amount: transaction.amount,
    formattedAmount: formatCurrency(transaction.amount),
    description: transaction.description,
    notes: transaction.notes,
    date: transaction.date.toISOString(),
    dueDate: transaction.dueDate ? transaction.dueDate.toISOString() : null,
    paidAt: transaction.paidAt ? transaction.paidAt.toISOString() : null,
    categoryId: transaction.categoryId,
    categoryName: transaction.categoryName ?? null,
    customerId: transaction.customerId,
    customerName: transaction.customerName ?? null,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export async function getCashFlowSummary(
  companyId: string,
): Promise<CashFlowSummaryDTO> {
  assertTenantId(companyId);

  const rows = await prisma.transaction.findMany({
    where: { companyId, deletedAt: null },
    select: { type: true, status: true, amount: true },
  });

  let incomePaid = 0;
  let expensePaid = 0;
  let pendingIncome = 0;
  let overdueIncome = 0;

  for (const row of rows) {
    const amount = Number(row.amount);
    if (row.type === "INCOME" && row.status === "PAID") incomePaid += amount;
    if (row.type === "EXPENSE" && row.status === "PAID") expensePaid += amount;
    if (row.type === "INCOME" && row.status === "PENDING") pendingIncome += amount;
    if (row.type === "INCOME" && row.status === "OVERDUE") overdueIncome += amount;
  }

  return {
    incomePaid,
    expensePaid,
    balance: incomePaid - expensePaid,
    pendingIncome,
    overdueIncome,
    transactionCount: rows.length,
  };
}

export async function getFinanceOverview(
  companyId: string,
  params?: TransactionListParams,
): Promise<FinanceOverviewDTO> {
  assertTenantId(companyId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [list, categoryList, cashFlow, todayRows] = await Promise.all([
    transactions.list(companyId, { page: 1, pageSize: 100, ...params }),
    categories.list(companyId),
    getCashFlowSummary(companyId),
    prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        date: { gte: todayStart, lte: todayEnd },
      },
      select: { type: true, status: true, amount: true },
    }),
  ]);

  let todayIncome = 0;
  let todayExpense = 0;
  for (const row of todayRows) {
    const amount = Number(row.amount);
    if (row.type === "INCOME" && row.status === "PAID") todayIncome += amount;
    if (row.type === "EXPENSE" && row.status === "PAID") todayExpense += amount;
  }

  return {
    transactions: list.items.map(toTransactionClientDTO),
    total: list.total,
    categories: categoryList.map(toCategoryClientDTO),
    cashFlow,
    todayIncome,
    todayExpense,
    todayCount: todayRows.length,
  };
}

export async function listFinanceTransactions(
  companyId: string,
  params?: TransactionListParams,
): Promise<{ items: TransactionClientDTO[]; total: number }> {
  const result = await transactions.list(companyId, params);
  return {
    items: result.items.map(toTransactionClientDTO),
    total: result.total,
  };
}

export async function listFinanceCategories(
  companyId: string,
  type?: "INCOME" | "EXPENSE",
): Promise<CategoryClientDTO[]> {
  const result = await categories.list(companyId, type);
  return result.map(toCategoryClientDTO);
}

export async function createFinanceTransaction(params: {
  companyId: string;
  userId: string;
  data: CreateTransactionDTO;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<TransactionClientDTO> {
  const created = await transactions.create(params.companyId, params.data);
  const full = (await transactions.findById(params.companyId, created.id)) ?? created;
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "finance",
    action: "create",
    entity: "Transaction",
    entityId: created.id,
    metadata: {
      type: created.type,
      amount: created.amount,
      status: created.status,
    },
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateFinanceCaches(params.companyId);
  return toTransactionClientDTO(full);
}

export async function updateFinanceTransaction(params: {
  companyId: string;
  userId: string;
  id: string;
  data: UpdateTransactionDTO;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<TransactionClientDTO> {
  const updated = await transactions.update(params.companyId, params.id, params.data);
  const full = (await transactions.findById(params.companyId, updated.id)) ?? updated;
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "finance",
    action: "update",
    entity: "Transaction",
    entityId: updated.id,
    metadata: {
      type: updated.type,
      amount: updated.amount,
      status: updated.status,
    },
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateFinanceCaches(params.companyId);
  return toTransactionClientDTO(full);
}

export async function deleteFinanceTransaction(params: {
  companyId: string;
  userId: string;
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await transactions.softDelete(params.companyId, params.id);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "finance",
    action: "soft_delete",
    entity: "Transaction",
    entityId: params.id,
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateFinanceCaches(params.companyId);
}

export async function createFinanceCategory(params: {
  companyId: string;
  userId: string;
  data: CreateCategoryDTO;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<CategoryClientDTO> {
  const created = await categories.create(params.companyId, params.data);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "finance",
    action: "create",
    entity: "Category",
    entityId: created.id,
    metadata: { name: created.name, type: created.type },
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateFinanceCaches(params.companyId);
  return toCategoryClientDTO(created);
}

export async function deleteFinanceCategory(params: {
  companyId: string;
  userId: string;
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await categories.softDelete(params.companyId, params.id);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "finance",
    action: "soft_delete",
    entity: "Category",
    entityId: params.id,
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateFinanceCaches(params.companyId);
}

export async function updateFinanceCategory(params: {
  companyId: string;
  userId: string;
  id: string;
  data: UpdateCategoryDTO;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<CategoryClientDTO> {
  const updated = await categories.update(params.companyId, params.id, params.data);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "finance",
    action: "update",
    entity: "Category",
    entityId: updated.id,
    metadata: { name: updated.name, type: updated.type },
    ip: params.ip,
    userAgent: params.userAgent,
  });
  invalidateFinanceCaches(params.companyId);
  return toCategoryClientDTO(updated);
}
