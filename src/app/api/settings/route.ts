import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/shared/lib/auth";
import { hasPermission } from "@/shared/lib/rbac";
import {
  companyProfileSchema,
  updateSettingsPayloadSchema,
} from "@/modules/settings/schemas/settings.schemas";
import {
  getSettingsOverview,
  updateCompanyProfile,
  updateCompanySettings,
} from "@/modules/settings/services/settings.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "settings:view")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const data = await getSettingsOverview({
    companyId: session.user.companyId,
    userId: session.user.id,
    userName: session.user.name ?? null,
    userEmail: session.user.email ?? null,
    role: session.user.role,
  });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "settings:manage")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      section?: "profile" | "settings";
      data?: unknown;
    };
    const section = body.section ?? "settings";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent");

    if (section === "profile") {
      const data = companyProfileSchema.parse(body.data ?? body);
      const updated = await updateCompanyProfile({
        companyId: session.user.companyId,
        userId: session.user.id,
        data,
        ip,
        userAgent,
      });
      return NextResponse.json(updated);
    }

    const data = updateSettingsPayloadSchema.parse(body.data ?? body);
    const updated = await updateCompanySettings({
      companyId: session.user.companyId,
      userId: session.user.id,
      data,
      ip,
      userAgent,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}
