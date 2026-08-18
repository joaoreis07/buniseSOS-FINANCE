"use server";

import { ZodError } from "zod";
import { requirePermission } from "@/shared/lib/session";
import { createSaleSchema, receiveInstallmentSchema, saleIdSchema, updateInstallmentSchema, updateSaleSchema } from "../schemas/crm.schemas";
import {
  cancelSale,
  createSale,
  getCrmDashboardStats,
  getCustomerCrmDetail,
  getReceivablesOverview,
  listCustomersCrm,
  receiveInstallment,
  updateInstallment,
  updateSale,
} from "../services/crm.service";

export type CrmActionResult<T = undefined> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

export async function listCustomersCrmAction(filters?: {
  search?: string;
  phone?: string;
  financialStatus?: string;
}): Promise<CrmActionResult<Awaited<ReturnType<typeof listCustomersCrm>>>> {
  try {
    const user = await requirePermission("customers:view");
    const data = await listCustomersCrm(user.companyId, filters);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar os clientes",
    };
  }
}

export async function getCustomerCrmDetailAction(
  customerId: string,
): Promise<CrmActionResult<NonNullable<Awaited<ReturnType<typeof getCustomerCrmDetail>>>>> {
  try {
    const user = await requirePermission("customers:view");
    const data = await getCustomerCrmDetail(user.companyId, customerId);
    if (!data) return { success: false, error: "Cliente não encontrado" };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar o cliente",
    };
  }
}

export async function createSaleAction(input: unknown): Promise<CrmActionResult<{ saleId: string }>> {
  try {
    const user = await requirePermission("finance:manage");
    const data = createSaleSchema.parse(input);
    const result = await createSale({
      companyId: user.companyId,
      userId: user.id,
      data,
    });
    return { success: true, data: result, message: "Venda registrada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível registrar a venda",
    };
  }
}

export async function updateSaleAction(input: unknown): Promise<CrmActionResult> {
  try {
    const user = await requirePermission("finance:manage");
    const data = updateSaleSchema.parse(input);
    await updateSale({
      companyId: user.companyId,
      userId: user.id,
      data,
    });
    return { success: true, data: undefined, message: "Compra atualizada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível atualizar a compra",
    };
  }
}

export async function cancelSaleAction(input: unknown): Promise<CrmActionResult> {
  try {
    const user = await requirePermission("finance:manage");
    const data = saleIdSchema.parse(input);
    await cancelSale({
      companyId: user.companyId,
      userId: user.id,
      saleId: data.id,
    });
    return { success: true, data: undefined, message: "Compra removida" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível remover a compra",
    };
  }
}

export async function updateInstallmentAction(input: unknown): Promise<CrmActionResult> {
  try {
    const user = await requirePermission("finance:manage");
    const data = updateInstallmentSchema.parse(input);
    await updateInstallment({
      companyId: user.companyId,
      userId: user.id,
      data,
    });
    return { success: true, data: undefined, message: "Parcela atualizada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível atualizar a parcela",
    };
  }
}

export async function receiveInstallmentAction(
  input: unknown,
): Promise<CrmActionResult<{ fullyPaid: boolean; amountRemaining: number }>> {
  try {
    const user = await requirePermission("finance:manage");
    const data = receiveInstallmentSchema.parse(input);
    const result = await receiveInstallment({
      companyId: user.companyId,
      userId: user.id,
      data,
    });
    return {
      success: true,
      data: result,
      message: result.fullyPaid
        ? "Parcela quitada"
        : `Pagamento parcial registrado · saldo ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(result.amountRemaining)}`,
    };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível receber a parcela",
    };
  }
}

export async function getReceivablesAction(input?: {
  yearMonth?: string;
  status?: "all" | "pending" | "paid" | "overdue";
}): Promise<CrmActionResult<Awaited<ReturnType<typeof getReceivablesOverview>>>> {
  try {
    const user = await requirePermission("finance:view");
    const data = await getReceivablesOverview(user.companyId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar contas a receber",
    };
  }
}

export async function getCrmDashboardStatsAction(): Promise<
  CrmActionResult<Awaited<ReturnType<typeof getCrmDashboardStats>>>
> {
  try {
    const user = await requirePermission("dashboard:view");
    const data = await getCrmDashboardStats(user.companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar indicadores CRM",
    };
  }
}
