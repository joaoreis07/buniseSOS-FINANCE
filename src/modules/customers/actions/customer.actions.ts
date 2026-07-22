"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { requirePermission } from "@/shared/lib/session";
import type { CustomerClientDTO, CustomerDetailClientDTO } from "../dto/customer.dto";
import {
  createCustomerSchema,
  customerIdSchema,
  customerListQuerySchema,
  updateCustomerWithIdSchema,
} from "../schemas/customer.schemas";
import {
  createCustomer,
  deleteCustomer,
  getCustomerDetail,
  listCustomers,
  updateCustomer,
} from "../services/customer.service";

export type CustomerActionResult<T = undefined> =
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

export async function listCustomersAction(
  input: unknown = {},
): Promise<CustomerActionResult<{ items: CustomerClientDTO[]; total: number }>> {
  try {
    const user = await requirePermission("customers:view");
    const query = customerListQuerySchema.parse(input ?? {});
    const data = await listCustomers(user.companyId, query);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: zodMessage(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível listar clientes",
    };
  }
}

export async function getCustomerDetailAction(
  input: unknown,
): Promise<CustomerActionResult<CustomerDetailClientDTO>> {
  try {
    const user = await requirePermission("customers:view");
    const { id } = customerIdSchema.parse(input);
    const detail = await getCustomerDetail(user.companyId, id);
    if (!detail) {
      return { success: false, error: "Cliente não encontrado" };
    }
    return { success: true, data: detail };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: zodMessage(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar o cliente",
    };
  }
}

export async function createCustomerAction(
  input: unknown,
): Promise<CustomerActionResult<CustomerClientDTO>> {
  try {
    const user = await requirePermission("customers:manage");
    const data = createCustomerSchema.parse(input);
    const meta = await requestMeta();
    const created = await createCustomer({
      companyId: user.companyId,
      userId: user.id,
      data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: created, message: "Cliente criado" };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: zodMessage(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível criar o cliente",
    };
  }
}

export async function updateCustomerAction(
  input: unknown,
): Promise<CustomerActionResult<CustomerClientDTO>> {
  try {
    const user = await requirePermission("customers:manage");
    const parsed = updateCustomerWithIdSchema.parse(input);
    const { id, ...data } = parsed;
    const meta = await requestMeta();
    const updated = await updateCustomer({
      companyId: user.companyId,
      userId: user.id,
      id,
      data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: updated, message: "Cliente atualizado" };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: zodMessage(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível atualizar o cliente",
    };
  }
}

export async function deleteCustomerAction(
  input: unknown,
): Promise<CustomerActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("customers:manage");
    const { id } = customerIdSchema.parse(input);
    const meta = await requestMeta();
    await deleteCustomer({
      companyId: user.companyId,
      userId: user.id,
      id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: { id }, message: "Cliente removido" };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: zodMessage(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível remover o cliente",
    };
  }
}
