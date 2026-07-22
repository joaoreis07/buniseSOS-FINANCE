"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { requirePermission } from "@/shared/lib/session";
import type { CategoryClientDTO, TransactionClientDTO } from "../dto/finance.dto";
import {
  createCategorySchema,
  createTransactionSchema,
  categoryIdSchema,
  financeListQuerySchema,
  transactionIdSchema,
  updateTransactionWithIdSchema,
} from "../schemas/finance.schemas";
import {
  createFinanceCategory,
  createFinanceTransaction,
  deleteFinanceCategory,
  deleteFinanceTransaction,
  getFinanceOverview,
  listFinanceTransactions,
  updateFinanceTransaction,
} from "../services/finance.service";

export type FinanceActionResult<T = undefined> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const headerStore = await headers();
  return {
    ip:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
  };
}

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

export async function getFinanceOverviewAction() {
  try {
    const user = await requirePermission("finance:view");
    const data = await getFinanceOverview(user.companyId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível carregar o financeiro",
    };
  }
}

export async function listTransactionsAction(
  input: unknown = {},
): Promise<FinanceActionResult<{ items: TransactionClientDTO[]; total: number }>> {
  try {
    const user = await requirePermission("finance:view");
    const query = financeListQuerySchema.parse(input ?? {});
    const data = await listFinanceTransactions(user.companyId, query);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível listar movimentações",
    };
  }
}

export async function createTransactionAction(
  input: unknown,
): Promise<FinanceActionResult<TransactionClientDTO>> {
  try {
    const user = await requirePermission("finance:manage");
    const data = createTransactionSchema.parse(input);
    const meta = await requestMeta();
    const created = await createFinanceTransaction({
      companyId: user.companyId,
      userId: user.id,
      data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: created, message: "Movimentação criada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível criar a movimentação",
    };
  }
}

export async function updateTransactionAction(
  input: unknown,
): Promise<FinanceActionResult<TransactionClientDTO>> {
  try {
    const user = await requirePermission("finance:manage");
    const parsed = updateTransactionWithIdSchema.parse(input);
    const { id, ...data } = parsed;
    const meta = await requestMeta();
    const updated = await updateFinanceTransaction({
      companyId: user.companyId,
      userId: user.id,
      id,
      data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: updated, message: "Movimentação atualizada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível atualizar a movimentação",
    };
  }
}

export async function deleteTransactionAction(
  input: unknown,
): Promise<FinanceActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("finance:manage");
    const { id } = transactionIdSchema.parse(input);
    const meta = await requestMeta();
    await deleteFinanceTransaction({
      companyId: user.companyId,
      userId: user.id,
      id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: { id }, message: "Movimentação removida" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível remover a movimentação",
    };
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<FinanceActionResult<CategoryClientDTO>> {
  try {
    const user = await requirePermission("finance:manage");
    const data = createCategorySchema.parse(input);
    const meta = await requestMeta();
    const created = await createFinanceCategory({
      companyId: user.companyId,
      userId: user.id,
      data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: created, message: "Categoria criada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível criar a categoria",
    };
  }
}

export async function deleteCategoryAction(
  input: unknown,
): Promise<FinanceActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("finance:manage");
    const { id } = categoryIdSchema.parse(input);
    const meta = await requestMeta();
    await deleteFinanceCategory({
      companyId: user.companyId,
      userId: user.id,
      id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: { id }, message: "Categoria removida" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível remover a categoria",
    };
  }
}
