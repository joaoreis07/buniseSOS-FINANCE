"use server";

import { revalidateTag } from "next/cache";
import { requirePermission } from "@/shared/lib/session";
import {
  getDashboardCacheTag,
  getDashboardData,
} from "../services/dashboard.service";
import type { DashboardResponseDTO } from "../dto/dashboard.dto";

export async function getDashboardAction(): Promise<DashboardResponseDTO> {
  const user = await requirePermission("dashboard:view");
  return getDashboardData(user.companyId);
}

export async function revalidateDashboardAction(): Promise<{ success: true }> {
  const user = await requirePermission("dashboard:view");
  revalidateTag(getDashboardCacheTag(user.companyId));
  return { success: true };
}
