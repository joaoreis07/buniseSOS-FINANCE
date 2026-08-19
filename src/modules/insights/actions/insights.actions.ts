"use server";

import { requirePermission } from "@/shared/lib/session";
import type { InsightsOverviewDTO } from "../dto/insights.dto";
import { getInsightsOverview } from "../services/insights.service";

export async function getInsightsOverviewAction(): Promise<InsightsOverviewDTO> {
  const user = await requirePermission("finance:view");
  return getInsightsOverview(user.companyId);
}
