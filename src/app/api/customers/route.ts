import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/shared/lib/auth";
import { hasPermission } from "@/shared/lib/rbac";
import {
  createCustomerSchema,
  customerListQuerySchema,
} from "@/modules/customers/schemas/customer.schemas";
import {
  createCustomer,
  listCustomers,
} from "@/modules/customers/services/customer.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "customers:view")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const query = customerListQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const data = await listCustomers(session.user.companyId, query);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Parâmetros inválidos" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Erro ao listar clientes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "customers:manage")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createCustomerSchema.parse(body);
    const created = await createCustomer({
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
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}
