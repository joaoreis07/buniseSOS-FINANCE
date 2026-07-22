import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/shared/lib/auth";
import { hasPermission } from "@/shared/lib/rbac";
import { updateTransactionWithIdSchema } from "@/modules/finance/schemas/finance.schemas";
import {
  deleteFinanceTransaction,
  updateFinanceTransaction,
} from "@/modules/finance/services/finance.service";
import { PrismaTransactionRepository } from "@/modules/finance/repositories/prisma-finance.repository";
import { toTransactionClientDTO } from "@/modules/finance/services/finance.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "finance:view")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await context.params;
  const repo = new PrismaTransactionRepository();
  const item = await repo.findById(session.user.companyId, id);
  if (!item) {
    return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 });
  }
  return NextResponse.json(toTransactionClientDTO(item));
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "finance:manage")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateTransactionWithIdSchema.parse({ id, ...body });
    const { id: transactionId, ...data } = parsed;
    const updated = await updateFinanceTransaction({
      companyId: session.user.companyId,
      userId: session.user.id,
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
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "finance:manage")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await deleteFinanceTransaction({
      companyId: session.user.companyId,
      userId: session.user.id,
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
