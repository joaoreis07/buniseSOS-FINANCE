import { NextResponse } from "next/server";
import { resolveApiPermission } from "@/shared/lib/api-session";
import { getDashboardData } from "@/modules/dashboard/services/dashboard.service";

export async function GET() {
  const authResult = await resolveApiPermission("dashboard:view");
  if (!authResult.ok) {
    return authResult.response;
  }

  const data = await getDashboardData(authResult.user.companyId);
  return NextResponse.json(data);
}
