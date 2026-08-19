import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiPermission } from "@/shared/lib/api-session";
import { updateTransactionWithIdSchema } from "@/modules/finance/schemas/finance.schemas";
import {
  deleteFinanceTransaction,
  updateFinanceTransaction,
} from "@/modules/finance/services/finance.service";
import { PrismaTransactionRepository } from "@/modules/finance/repositories/prisma-finance.repository";
import { toTransactionClientDTO } from "@/modules/finance/services/finance.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await resolveApiPermission("finance:view");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id } = await context.params;
  const repo = new PrismaTransactionRepository();
  const item = await repo.findById(user.companyId, id);
  if (!item) {
    return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 });
  }
  return NextResponse.json(toTransactionClientDTO(item));
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await resolveApiPermission("finance:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateTransactionWithIdSchema.parse({ id, ...body });
    const { id: transactionId, ...data } = parsed;
    const updated = await updateFinanceTransaction({
      companyId: user.companyId,
      userId: user.id,
      id: transactionId,
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
    const message = error instanceof Error ? error.message : "Erro ao atualizar";
    const status = message === "Transaction not found" ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? "Movimentação não encontrada" : message },
      { status },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await resolveApiPermission("finance:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const { id } = await context.params;
    await deleteFinanceTransaction({
      companyId: user.companyId,
      userId: user.id,
      id,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover";
    const status = message === "Transaction not found" ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? "Movimentação não encontrada" : message },
      { status },
    );
  }
}
