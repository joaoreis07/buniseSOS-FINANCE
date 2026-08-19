"use server";

import { ZodError } from "zod";
import { createSale } from "@/modules/crm/services/crm.service";
import { createSaleSchema } from "@/modules/crm/schemas/crm.schemas";
import type { SaleListResultDTO } from "@/modules/crm/dto/crm.dto";
import { requirePermission } from "@/shared/lib/session";
import { listSales, listSalesCustomers } from "../services/sales.service";
import { listSalesSchema } from "../schemas/sales.schemas";

export type SalesActionResult<T = undefined> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

export async function listSalesAction(
  input: unknown,
): Promise<SalesActionResult<SaleListResultDTO>> {
  try {
    const user = await requirePermission("sales:view");
    const filters = listSalesSchema.parse(input ?? {});
    const data = await listSales({
      companyId: user.companyId,
      filters,
    });
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof ZodError) {
      return { success: false, error: zodMessage(error) };
    }
    return {
      success: false,
      error: "Não foi possível carregar as vendas",
    };
  }
}

export async function listSalesCustomersAction(): Promise<
  SalesActionResult<Array<{ id: string; name: string }>>
> {
  try {
    const user = await requirePermission("sales:manage");
    const data = await listSalesCustomers(user.companyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return {
      success: false,
      error: "Não foi possível carregar os clientes",
    };
  }
}

export async function createSaleAction(
  input: unknown,
): Promise<SalesActionResult<{ saleId: string }>> {
  try {
    const user = await requirePermission("sales:manage");
    const data = createSaleSchema.parse(input);
    const result = await createSale({
      companyId: user.companyId,
      userId: user.id,
      data,
    });
    return { success: true, data: result, message: "Venda registrada" };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível registrar a venda",
    };
  }
}
