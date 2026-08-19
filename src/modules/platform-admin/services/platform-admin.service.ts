import type { Plan, SubscriptionStatus } from "@prisma/client";
import {
  PrismaAuditLogRepository,
  PrismaSystemLogRepository,
} from "@/shared/repositories/prisma-repositories";
import type { PlatformAdminOverviewDTO, PlatformTenantDTO } from "../dto/platform-admin.dto";
import {
  PrismaPlatformAdminRepository,
  type IPlatformAdminRepository,
  type PlatformCompanyRow,
} from "../repositories/platform-admin.repository";

const PLAN_LABELS: Record<Plan, string> = {
  STARTER: "Starter",
  PROFESSIONAL: "Profissional",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: "Trial",
  ACTIVE: "Ativo",
  PAST_DUE: "Em atraso",
  CANCELED: "Cancelado",
  INCOMPLETE: "Incompleto",
};

const repo: IPlatformAdminRepository = new PrismaPlatformAdminRepository();
const auditLogs = new PrismaAuditLogRepository();
const systemLogs = new PrismaSystemLogRepository();

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function mapTenant(row: PlatformCompanyRow): PlatformTenantDTO {
  const adminMembership =
    row.memberships.find((item) => item.role === "ADMIN" && !item.user.deletedAt) ??
    row.memberships.find((item) => !item.user.deletedAt) ??
    null;

  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj,
    plan: row.plan,
    planName: PLAN_LABELS[row.plan] ?? row.plan,
    subscriptionStatus: row.subscriptionStatus,
    statusLabel: STATUS_LABEL[row.subscriptionStatus],
    createdAt: row.createdAt.toISOString(),
    createdAtLabel: formatDate(row.createdAt),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    isRemoved: Boolean(row.deletedAt),
    ownerName: adminMembership?.user.name ?? null,
    ownerEmail: adminMembership?.user.email ?? null,
    userCount: row._count.memberships,
    customerCount: row._count.customers,
  };
}

export async function getPlatformAdminOverview(): Promise<PlatformAdminOverviewDTO> {
  const rows = await repo.listCompanies();
  const tenants = rows.map(mapTenant);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const activeCompanies = tenants.filter((item) => !item.isRemoved);

  return {
    totals: {
      companies: activeCompanies.length,
      active: activeCompanies.filter((item) => item.subscriptionStatus === "ACTIVE").length,
      trialing: activeCompanies.filter((item) => item.subscriptionStatus === "TRIALING").length,
      paid: activeCompanies.filter(
        (item) => item.plan === "PROFESSIONAL" || item.plan === "BUSINESS",
      ).length,
      canceled: activeCompanies.filter((item) => item.subscriptionStatus === "CANCELED").length,
      removed: tenants.filter((item) => item.isRemoved).length,
      newThisWeek: activeCompanies.filter(
        (item) => new Date(item.createdAt).getTime() >= weekAgo,
      ).length,
    },
    tenants,
  };
}

export async function updatePlatformTenant(params: {
  actorUserId: string;
  actorEmail: string | null;
  companyId: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<PlatformTenantDTO> {
  const existing = await repo.findCompany(params.companyId);
  if (!existing) {
    throw new Error("Empresa não encontrada");
  }
  if (existing.deletedAt) {
    throw new Error("Empresa removida. Restaure antes de editar.");
  }

  await repo.updateCompany(params.companyId, {
    plan: params.plan,
    subscriptionStatus: params.subscriptionStatus,
  });

  await auditLogs.create({
    companyId: params.companyId,
    userId: params.actorUserId,
    module: "platform-admin",
    action: "update_tenant",
    entity: "Company",
    entityId: params.companyId,
    metadata: {
      before: { plan: existing.plan, subscriptionStatus: existing.subscriptionStatus },
      after: { plan: params.plan, subscriptionStatus: params.subscriptionStatus },
      actorEmail: params.actorEmail,
    },
    ip: params.ip,
    userAgent: params.userAgent,
  });

  const updated = await repo.findCompany(params.companyId);
  if (!updated) {
    throw new Error("Empresa não encontrada após atualização");
  }
  return mapTenant(updated);
}

export async function removePlatformTenant(params: {
  actorUserId: string;
  actorEmail: string | null;
  companyId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const existing = await repo.findCompany(params.companyId);
  if (!existing) {
    throw new Error("Empresa não encontrada");
  }
  if (existing.deletedAt) {
    throw new Error("Empresa já está removida");
  }

  await repo.softRemoveCompany(params.companyId);

  await auditLogs.create({
    companyId: params.companyId,
    userId: params.actorUserId,
    module: "platform-admin",
    action: "remove_tenant",
    entity: "Company",
    entityId: params.companyId,
    metadata: { companyName: existing.name, actorEmail: params.actorEmail },
    ip: params.ip,
    userAgent: params.userAgent,
  });

  await systemLogs.create({
    companyId: params.companyId,
    userId: params.actorUserId,
    level: "WARNING",
    module: "platform-admin",
    message: `Empresa removida pelo admin da plataforma: ${existing.name}`,
    ip: params.ip,
    browser: params.userAgent,
  });
}

export async function restorePlatformTenant(params: {
  actorUserId: string;
  actorEmail: string | null;
  companyId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<PlatformTenantDTO> {
  const existing = await repo.findCompany(params.companyId);
  if (!existing) {
    throw new Error("Empresa não encontrada");
  }
  if (!existing.deletedAt) {
    throw new Error("Empresa não está removida");
  }

  await repo.restoreCompany(params.companyId);

  await auditLogs.create({
    companyId: params.companyId,
    userId: params.actorUserId,
    module: "platform-admin",
    action: "restore_tenant",
    entity: "Company",
    entityId: params.companyId,
    metadata: { companyName: existing.name, actorEmail: params.actorEmail },
    ip: params.ip,
    userAgent: params.userAgent,
  });

  const updated = await repo.findCompany(params.companyId);
  if (!updated) {
    throw new Error("Empresa não encontrada após restauração");
  }
  return mapTenant(updated);
}
