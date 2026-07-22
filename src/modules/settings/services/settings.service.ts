import { revalidateTag } from "next/cache";
import { getDashboardCacheTag } from "@/modules/dashboard/services/dashboard.service";
import type { Role } from "@prisma/client";
import {
  PrismaAuditLogRepository,
  PrismaCompanyRepository,
  PrismaCompanySettingsRepository,
  PrismaNotificationRepository,
  PrismaSystemLogRepository,
} from "@/shared/repositories/prisma-repositories";
import type {
  AuditLogClientDTO,
  CompanyProfileClientDTO,
  CompanySettingsClientDTO,
  NotificationClientDTO,
  SettingsOverviewDTO,
  SystemLogClientDTO,
} from "../dto/settings.dto";

const companies = new PrismaCompanyRepository();
const settingsRepo = new PrismaCompanySettingsRepository();
const notificationsRepo = new PrismaNotificationRepository();
const auditLogs = new PrismaAuditLogRepository();
const systemLogs = new PrismaSystemLogRepository();

export function getSettingsCacheTag(companyId: string): string {
  return `settings:${companyId}`;
}

function invalidateSettingsCaches(companyId: string): void {
  try {
    revalidateTag(getSettingsCacheTag(companyId));
    revalidateTag(getDashboardCacheTag(companyId));
  } catch {
    // Outside Next.js request context
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function getSettingsOverview(params: {
  companyId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  role: Role;
}): Promise<SettingsOverviewDTO> {
  const [company, settings, notifications, audits, systems] = await Promise.all([
    companies.findById(params.companyId),
    settingsRepo.findByCompanyId(params.companyId),
    notificationsRepo.list(params.companyId, params.userId),
    auditLogs.list(params.companyId, { page: 1, pageSize: 15 }),
    systemLogs.list(params.companyId, { page: 1, pageSize: 10 }),
  ]);

  if (!company) {
    throw new Error("Empresa não encontrada");
  }

  const ensuredSettings =
    settings ??
    (await settingsRepo.upsert(params.companyId, {
      theme: "light",
      language: "pt-BR",
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      dateFormat: "dd/MM/yyyy",
      notifications: true,
      monthlyGoal: 0,
    }));

  return {
    company: {
      id: company.id,
      name: company.name,
      cnpj: company.cnpj,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      zipCode: company.zipCode,
    },
    settings: toSettingsClient(ensuredSettings),
    profile: {
      id: params.userId,
      name: params.userName,
      email: params.userEmail,
      role: params.role,
    },
    notifications: notifications.map(toNotificationClient),
    auditLogs: audits.items.map(toAuditClient),
    systemLogs: systems.items.map(toSystemClient),
  };
}

function toSettingsClient(settings: {
  id: string;
  companyId: string;
  theme: string;
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  notifications: boolean;
  monthlyGoal: number;
  createdAt: Date;
  updatedAt: Date;
}): CompanySettingsClientDTO {
  return {
    id: settings.id,
    companyId: settings.companyId,
    theme: settings.theme,
    language: settings.language,
    currency: settings.currency,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
    notifications: settings.notifications,
    monthlyGoal: settings.monthlyGoal,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function toNotificationClient(item: {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}): NotificationClientDTO {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    read: item.read,
    createdAt: item.createdAt.toISOString(),
  };
}

function toAuditClient(item: {
  id: string;
  module: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  userName?: string | null;
  createdAt: Date;
}): AuditLogClientDTO {
  return {
    id: item.id,
    module: item.module,
    action: item.action,
    entity: item.entity,
    entityId: item.entityId,
    userName: item.userName ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

function toSystemClient(item: {
  id: string;
  level: string;
  module: string;
  message: string;
  createdAt: Date;
}): SystemLogClientDTO {
  return {
    id: item.id,
    level: item.level,
    module: item.module,
    message: item.message,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function updateCompanyProfile(params: {
  companyId: string;
  userId: string;
  data: {
    name: string;
    cnpj: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  ip?: string | null;
  userAgent?: string | null;
}): Promise<CompanyProfileClientDTO> {
  const updated = await companies.update(params.companyId, {
    name: params.data.name,
    cnpj: emptyToNull(params.data.cnpj),
    phone: emptyToNull(params.data.phone),
    address: emptyToNull(params.data.address),
    city: emptyToNull(params.data.city),
    state: emptyToNull(params.data.state)
      ? params.data.state.trim().toUpperCase().slice(0, 2)
      : null,
    zipCode: emptyToNull(params.data.zipCode),
  });

  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "settings",
    action: "update",
    entity: "Company",
    entityId: updated.id,
    metadata: { name: updated.name },
    ip: params.ip,
    userAgent: params.userAgent,
  });

  await systemLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    level: "INFO",
    module: "settings",
    message: `Perfil da empresa atualizado: ${updated.name}`,
    ip: params.ip,
    browser: params.userAgent,
  });

  invalidateSettingsCaches(params.companyId);

  return {
    id: updated.id,
    name: updated.name,
    cnpj: updated.cnpj,
    phone: updated.phone,
    address: updated.address,
    city: updated.city,
    state: updated.state,
    zipCode: updated.zipCode,
  };
}

export async function updateCompanySettings(params: {
  companyId: string;
  userId: string;
  data: {
    theme: string;
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    notifications: boolean;
    monthlyGoal: number;
  };
  ip?: string | null;
  userAgent?: string | null;
}): Promise<CompanySettingsClientDTO> {
  const updated = await settingsRepo.upsert(params.companyId, params.data);

  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "settings",
    action: "update",
    entity: "CompanySettings",
    entityId: updated.id,
    metadata: {
      theme: updated.theme,
      monthlyGoal: updated.monthlyGoal,
      notifications: updated.notifications,
    },
    ip: params.ip,
    userAgent: params.userAgent,
  });

  await systemLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    level: "INFO",
    module: "settings",
    message: `Preferências atualizadas (meta ${updated.monthlyGoal})`,
    ip: params.ip,
    browser: params.userAgent,
  });

  invalidateSettingsCaches(params.companyId);
  return toSettingsClient(updated);
}

export async function markNotificationRead(params: {
  companyId: string;
  userId: string;
  id: string;
}): Promise<void> {
  await notificationsRepo.markAsRead(params.companyId, params.id);
  await auditLogs.create({
    companyId: params.companyId,
    userId: params.userId,
    module: "settings",
    action: "mark_read",
    entity: "Notification",
    entityId: params.id,
  });
  invalidateSettingsCaches(params.companyId);
}
