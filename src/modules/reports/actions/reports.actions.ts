"use server";

import { requirePermission } from "@/shared/lib/session";
import { getMonthlyReportData } from "../services/reports.service";
import type { MonthlyReportDTO } from "../dto/reports.dto";

export async function getMonthlyReportAction(monthKey?: string): Promise<MonthlyReportDTO> {
  const user = await requirePermission("reports:view");
  return getMonthlyReportData(user.companyId, monthKey);
}
