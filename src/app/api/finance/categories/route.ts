import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiPermission } from "@/shared/lib/api-session";
import {
  createCategorySchema,
} from "@/modules/finance/schemas/finance.schemas";
import {
  createFinanceCategory,
  listFinanceCategories,
} from "@/modules/finance/services/finance.service";

export async function GET() {
  const authResult = await resolveApiPermission("finance:view");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const categories = await listFinanceCategories(user.companyId);
  return NextResponse.json({ items: categories });
}

export async function POST(request: Request) {
  const authResult = await resolveApiPermission("finance:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const body = await request.json();
    const data = createCategorySchema.parse(body);
    const created = await createFinanceCategory({
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
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}
