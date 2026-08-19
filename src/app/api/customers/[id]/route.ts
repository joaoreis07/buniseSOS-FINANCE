import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiPermission } from "@/shared/lib/api-session";
import { updateCustomerSchema } from "@/modules/customers/schemas/customer.schemas";
import {
  deleteCustomer,
  getCustomerDetail,
  updateCustomer,
} from "@/modules/customers/services/customer.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await resolveApiPermission("customers:view");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id } = await context.params;
  const detail = await getCustomerDetail(user.companyId, id);
  if (!detail) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await resolveApiPermission("customers:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = updateCustomerSchema.parse(body);
    const updated = await updateCustomer({
      companyId: user.companyId,
      userId: user.id,
      id,
      data,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar cliente";
    const status = message === "Customer not found" ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? "Cliente não encontrado" : message },
      { status },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await resolveApiPermission("customers:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const { id } = await context.params;
    await deleteCustomer({
      companyId: user.companyId,
      userId: user.id,
      id,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover cliente";
    const status = message === "Customer not found" ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? "Cliente não encontrado" : message },
      { status },
    );
  }
}
