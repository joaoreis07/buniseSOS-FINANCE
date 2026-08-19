import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiPermission } from "@/shared/lib/api-session";
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
  const authResult = await resolveApiPermission("finance:view");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const url = new URL(request.url);
    const query = financeListQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
    });

    const include = url.searchParams.get("include");
    const [transactions, cashFlow, categories] = await Promise.all([
      listFinanceTransactions(user.companyId, query),
      include === "overview"
        ? getCashFlowSummary(user.companyId)
        : Promise.resolve(null),
      include === "overview"
        ? listFinanceCategories(user.companyId)
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
  const authResult = await resolveApiPermission("finance:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const body = await request.json();
    const data = createTransactionSchema.parse(body);
    const created = await createFinanceTransaction({
      companyId: user.companyId,
      userId: user.id,
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
