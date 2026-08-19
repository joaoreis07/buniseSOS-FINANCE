"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { requirePermission } from "@/shared/lib/session";
import type {
  CompanyProfileClientDTO,
  CompanySettingsClientDTO,
  SettingsOverviewDTO,
} from "../dto/settings.dto";
import {
  companyProfileSchema,
  monthlyGoalSchema,
  notificationIdSchema,
  updateSettingsPayloadSchema,
} from "../schemas/settings.schemas";
import {
  getSettingsOverview,
  markNotificationRead,
  updateCompanyProfile,
  updateCompanySettings,
  updateMonthlyGoal,
} from "../services/settings.service";

export type SettingsActionResult<T = undefined> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const headerStore = await headers();
  return {
    ip:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
  };
}

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

export async function getSettingsOverviewAction(): Promise<
  SettingsActionResult<SettingsOverviewDTO>
> {
  try {
    const user = await requirePermission("settings:view");
    const data = await getSettingsOverview({
      companyId: user.companyId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar as configurações",
    };
  }
}

export async function updateCompanyProfileAction(
  input: unknown,
): Promise<SettingsActionResult<CompanyProfileClientDTO>> {
  try {
    const user = await requirePermission("settings:manage");
    const data = companyProfileSchema.parse(input);
    const meta = await requestMeta();
    const updated = await updateCompanyProfile({
      companyId: user.companyId,
      userId: user.id,
      data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: updated, message: "Empresa atualizada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível atualizar a empresa",
    };
  }
}

export async function updateCompanySettingsAction(
  input: unknown,
): Promise<SettingsActionResult<CompanySettingsClientDTO>> {
  try {
    const user = await requirePermission("settings:manage");
    const data = updateSettingsPayloadSchema.parse(input);
    const meta = await requestMeta();
    const updated = await updateCompanySettings({
      companyId: user.companyId,
      userId: user.id,
      data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: updated, message: "Preferências salvas" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível salvar as preferências",
    };
  }
}

export async function updateMonthlyGoalAction(
  input: unknown,
): Promise<SettingsActionResult<CompanySettingsClientDTO>> {
  try {
    const user = await requirePermission("settings:manage");
    const data = monthlyGoalSchema.parse(input);
    const meta = await requestMeta();
    const updated = await updateMonthlyGoal({
      companyId: user.companyId,
      userId: user.id,
      monthlyGoal: data.monthlyGoal,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: updated, message: "Meta mensal atualizada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível salvar a meta",
    };
  }
}

export async function markNotificationReadAction(
  input: unknown,
): Promise<SettingsActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("settings:view");
    const { id } = notificationIdSchema.parse(input);
    await markNotificationRead({
      companyId: user.companyId,
      userId: user.id,
      id,
    });
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível marcar a notificação",
    };
  }
}
