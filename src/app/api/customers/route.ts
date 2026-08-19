import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiPermission } from "@/shared/lib/api-session";
import {
  createCustomerSchema,
  customerListQuerySchema,
} from "@/modules/customers/schemas/customer.schemas";
import {
  createCustomer,
  listCustomers,
} from "@/modules/customers/services/customer.service";

export async function GET(request: Request) {
  const authResult = await resolveApiPermission("customers:view");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const url = new URL(request.url);
    const query = customerListQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const data = await listCustomers(user.companyId, query);
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
  const authResult = await resolveApiPermission("customers:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const body = await request.json();
    const data = createCustomerSchema.parse(body);
    const created = await createCustomer({
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
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}
