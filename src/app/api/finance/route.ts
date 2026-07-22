import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/shared/lib/auth";
import { hasPermission } from "@/shared/lib/rbac";
import {
  createTransactionSchema,
  financeListQuerySchema,
} from "@/modules/finance/schemas/finance.schemas";
import {
  createFinanceTransaction,
  getCashFlowSummary,
  listFinanceCategories,
  listFinanceTransactions,
} from "@/modules/finance/services/finance.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "finance:view")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const query = financeListQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const include = url.searchParams.get("include");
    const [transactions, cashFlow, categories] = await Promise.all([
      listFinanceTransactions(session.user.companyId, query),
      include === "overview"
        ? getCashFlowSummary(session.user.companyId)
        : Promise.resolve(null),
      include === "overview"
        ? listFinanceCategories(session.user.companyId)
        : Promise.resolve(null),
    ]);

    if (include === "overview") {
      return NextResponse.json({
        ...transactions,
        cashFlow,
        categories,
      });
    }

    return NextResponse.json(transactions);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Parâmetros inválidos" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Erro ao listar financeiro" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "finance:manage")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createTransactionSchema.parse(body);
    const created = await createFinanceTransaction({
      companyId: session.user.companyId,
      userId: session.user.id,
      data,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar movimentação" }, { status: 500 });
  }
}
