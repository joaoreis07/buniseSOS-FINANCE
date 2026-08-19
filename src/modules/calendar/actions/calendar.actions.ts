"use server";

import { requirePermission } from "@/shared/lib/session";
import type { CalendarOverviewDTO } from "../dto/calendar.dto";
import { getCalendarOverview } from "../services/calendar.service";

export async function getCalendarOverviewAction(
  monthKey?: string,
): Promise<CalendarOverviewDTO> {
  const user = await requirePermission("finance:view");
  return getCalendarOverview(user.companyId, monthKey);
}
