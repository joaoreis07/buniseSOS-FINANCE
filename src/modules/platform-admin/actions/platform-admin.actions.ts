"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { requirePlatformAdmin } from "@/shared/lib/platform-admin";
import type { PlatformAdminOverviewDTO, PlatformTenantDTO } from "../dto/platform-admin.dto";
import { tenantIdSchema, updateTenantSchema } from "../schemas/platform-admin.schemas";
import {
  getPlatformAdminOverview,
  removePlatformTenant,
  restorePlatformTenant,
  updatePlatformTenant,
} from "../services/platform-admin.service";

type ActionResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

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

export async function getPlatformAdminOverviewAction(): Promise<PlatformAdminOverviewDTO> {
  await requirePlatformAdmin();
  return getPlatformAdminOverview();
}

export async function updatePlatformTenantAction(
  input: unknown,
): Promise<ActionResult<PlatformTenantDTO>> {
  try {
    const user = await requirePlatformAdmin();
    const data = updateTenantSchema.parse(input);
    const meta = await requestMeta();
    const updated = await updatePlatformTenant({
      actorUserId: user.id,
      actorEmail: user.email,
      companyId: data.companyId,
      plan: data.plan,
      subscriptionStatus: data.subscriptionStatus,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: updated, message: "Empresa atualizada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível atualizar",
    };
  }
}

export async function removePlatformTenantAction(
  input: unknown,
): Promise<ActionResult<{ companyId: string }>> {
  try {
    const user = await requirePlatformAdmin();
    const data = tenantIdSchema.parse(input);
    const meta = await requestMeta();
    await removePlatformTenant({
      actorUserId: user.id,
      actorEmail: user.email,
      companyId: data.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: { companyId: data.companyId }, message: "Empresa removida" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível remover",
    };
  }
}

export async function restorePlatformTenantAction(
  input: unknown,
): Promise<ActionResult<PlatformTenantDTO>> {
  try {
    const user = await requirePlatformAdmin();
    const data = tenantIdSchema.parse(input);
    const meta = await requestMeta();
    const restored = await restorePlatformTenant({
      actorUserId: user.id,
      actorEmail: user.email,
      companyId: data.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { success: true, data: restored, message: "Empresa restaurada" };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: zodMessage(error) };
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível restaurar",
    };
  }
}
