import { NextResponse } from "next/server";
import { auth } from "@/shared/lib/auth";
import { hasPermission } from "@/shared/lib/rbac";
import { getDashboardData } from "@/modules/dashboard/services/dashboard.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.role) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "dashboard:view")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const data = await getDashboardData(session.user.companyId);
  return NextResponse.json(data);
}
