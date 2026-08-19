import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveApiPermission } from "@/shared/lib/api-session";
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
  const authResult = await resolveApiPermission("settings:view");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const data = await getSettingsOverview({
    companyId: user.companyId,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role,
  });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const authResult = await resolveApiPermission("settings:manage");
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

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
        companyId: user.companyId,
        userId: user.id,
        data,
        ip,
        userAgent,
      });
      return NextResponse.json(updated);
    }

    const data = updateSettingsPayloadSchema.parse(body.data ?? body);
    const updated = await updateCompanySettings({
      companyId: user.companyId,
      userId: user.id,
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
