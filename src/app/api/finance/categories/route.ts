import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/shared/lib/auth";
import { hasPermission } from "@/shared/lib/rbac";
import {
  createCategorySchema,
} from "@/modules/finance/schemas/finance.schemas";
import {
  createFinanceCategory,
  listFinanceCategories,
} from "@/modules/finance/services/finance.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "finance:view")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const categories = await listFinanceCategories(session.user.companyId);
  return NextResponse.json({ items: categories });
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
    const data = createCategorySchema.parse(body);
    const created = await createFinanceCategory({
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
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}
