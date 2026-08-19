import type { FeatureKey, Prisma, Role } from "@prisma/client";
import type {
  CompanyResponseDTO,
  CompanySettingsResponseDTO,
  CreateCompanyDTO,
  CreateUserDTO,
  UpdateCompanyDTO,
  UpdateCompanySettingsDTO,
  UpdateUserDTO,
  UserResponseDTO,
} from "@/shared/dto/core.dto";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import type {
  AuditLogItemDTO,
  CreateAuditLogDTO,
  CreateNotificationDTO,
  CreateSystemLogDTO,
  IAuditLogRepository,
  ICompanyRepository,
  ICompanySettingsRepository,
  IFeatureFlagRepository,
  IMembershipRepository,
  INotificationRepository,
  ISystemLogRepository,
  IUserRepository,
  NotificationResponseDTO,
  SystemLogItemDTO,
} from "./contracts";


function toUserDTO(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserResponseDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toCompanyDTO(company: {
  id: string;
  name: string;
  logo: string | null;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  plan: CompanyResponseDTO["plan"];
  subscriptionStatus: CompanyResponseDTO["subscriptionStatus"];
  createdAt: Date;
  updatedAt: Date;
}): CompanyResponseDTO {
  return {
    id: company.id,
    name: company.name,
    logo: company.logo,
    cnpj: company.cnpj,
    phone: company.phone,
    address: company.address,
    city: company.city,
    state: company.state,
    zipCode: company.zipCode,
    plan: company.plan,
    subscriptionStatus: company.subscriptionStatus,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export class PrismaUserRepository implements IUserRepository {
  async create(data: CreateUserDTO): Promise<UserResponseDTO> {
    const user = await prisma.user.create({
      data: {
        name: data.name ?? null,
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        image: data.image ?? null,
        emailVerified: data.emailVerified ?? null,
      },
    });
    return toUserDTO(user);
  }

  async update(id: string, data: UpdateUserDTO): Promise<UserResponseDTO> {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new Error("User not found");
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        image: data.image,
        emailVerified: data.emailVerified,
      },
    });
    return toUserDTO(user);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new Error("User not found");
    }
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findById(id: string): Promise<UserResponseDTO | null> {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    return user ? toUserDTO(user) : null;
  }

  async findByEmail(
    email: string,
  ): Promise<(UserResponseDTO & { passwordHash: string | null }) | null> {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) {
      return null;
    }
    return { ...toUserDTO(user), passwordHash: user.passwordHash };
  }
}

export class PrismaCompanyRepository implements ICompanyRepository {
  async create(data: CreateCompanyDTO): Promise<CompanyResponseDTO> {
    const company = await prisma.company.create({
      data: {
        name: data.name,
        logo: data.logo ?? null,
        cnpj: data.cnpj ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zipCode: data.zipCode ?? null,
        plan: data.plan ?? "STARTER",
        subscriptionStatus: data.subscriptionStatus ?? "TRIALING",
      },
    });
    return toCompanyDTO(company);
  }

  async update(id: string, data: UpdateCompanyDTO): Promise<CompanyResponseDTO> {
    const existing = await prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new Error("Company not found");
    }
    const company = await prisma.company.update({
      where: { id },
      data: {
        name: data.name,
        logo: data.logo,
        cnpj: data.cnpj,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        plan: data.plan,
        subscriptionStatus: data.subscriptionStatus,
      },
    });
    return toCompanyDTO(company);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new Error("Company not found");
    }
    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findById(id: string): Promise<CompanyResponseDTO | null> {
    const company = await prisma.company.findFirst({ where: { id, deletedAt: null } });
    return company ? toCompanyDTO(company) : null;
  }
}

export class PrismaCompanySettingsRepository implements ICompanySettingsRepository {
  async upsert(
    companyId: string,
    data: UpdateCompanySettingsDTO,
  ): Promise<CompanySettingsResponseDTO> {
    assertTenantId(companyId);
    const settings = await prisma.companySettings.upsert({
      where: { companyId },
      create: {
        companyId,
        theme: data.theme ?? "light",
        language: data.language ?? "pt-BR",
        currency: data.currency ?? "BRL",
        timezone: data.timezone ?? "America/Sao_Paulo",
        dateFormat: data.dateFormat ?? "dd/MM/yyyy",
        notifications: data.notifications ?? true,
        monthlyGoal: data.monthlyGoal ?? 0,
      },
      update: {
        theme: data.theme,
        language: data.language,
        currency: data.currency,
        timezone: data.timezone,
        dateFormat: data.dateFormat,
        notifications: data.notifications,
        monthlyGoal: data.monthlyGoal,
      },
    });

    return {
      id: settings.id,
      companyId: settings.companyId,
      theme: settings.theme,
      language: settings.language,
      currency: settings.currency,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      notifications: settings.notifications,
      monthlyGoal: Number(settings.monthlyGoal),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async findByCompanyId(companyId: string): Promise<CompanySettingsResponseDTO | null> {
    assertTenantId(companyId);
    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    if (!settings) {
      return null;
    }
    return {
      id: settings.id,
      companyId: settings.companyId,
      theme: settings.theme,
      language: settings.language,
      currency: settings.currency,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      notifications: settings.notifications,
      monthlyGoal: Number(settings.monthlyGoal),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}

export class PrismaMembershipRepository implements IMembershipRepository {
  async create(userId: string, companyId: string, role: Role): Promise<{ id: string }> {
    assertTenantId(companyId);
    const membership = await prisma.membership.create({
      data: { userId, companyId, role },
    });
    return { id: membership.id };
  }

  async findByUserAndCompany(
    userId: string,
    companyId: string,
  ): Promise<{ id: string; role: Role } | null> {
    assertTenantId(companyId);
    const membership = await prisma.membership.findFirst({
      where: { userId, companyId, deletedAt: null },
    });
    return membership ? { id: membership.id, role: membership.role } : null;
  }
}

export class PrismaAuditLogRepository implements IAuditLogRepository {
  async create(data: CreateAuditLogDTO): Promise<{ id: string }> {
    const log = await prisma.auditLog.create({
      data: {
        companyId: data.companyId ?? null,
        userId: data.userId ?? null,
        module: data.module,
        action: data.action,
        entity: data.entity ?? null,
        entityId: data.entityId ?? null,
        metadata:
          data.metadata === null || data.metadata === undefined
            ? undefined
            : (data.metadata as Prisma.InputJsonValue),
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
    return { id: log.id };
  }

  async list(
    companyId: string,
    params: { page?: number; pageSize?: number; module?: string } = {},
  ): Promise<{ items: AuditLogItemDTO[]; total: number }> {
    assertTenantId(companyId);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where = {
      companyId,
      ...(params.module ? { module: params.module } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        companyId: item.companyId,
        userId: item.userId,
        module: item.module,
        action: item.action,
        entity: item.entity,
        entityId: item.entityId,
        metadata: item.metadata,
        ip: item.ip,
        createdAt: item.createdAt,
        userName: item.user?.name ?? item.user?.email ?? null,
      })),
      total,
    };
  }
}

export class PrismaSystemLogRepository implements ISystemLogRepository {
  async create(data: CreateSystemLogDTO): Promise<{ id: string }> {
    const log = await prisma.systemLog.create({
      data: {
        companyId: data.companyId ?? null,
        userId: data.userId ?? null,
        level: data.level,
        module: data.module,
        message: data.message,
        ip: data.ip ?? null,
        browser: data.browser ?? null,
      },
    });
    return { id: log.id };
  }

  async list(
    companyId: string,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<{ items: SystemLogItemDTO[]; total: number }> {
    assertTenantId(companyId);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where = { companyId };

    const [items, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.systemLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        companyId: item.companyId,
        userId: item.userId,
        level: item.level,
        module: item.module,
        message: item.message,
        ip: item.ip,
        browser: item.browser,
        createdAt: item.createdAt,
      })),
      total,
    };
  }
}

export class PrismaFeatureFlagRepository implements IFeatureFlagRepository {
  async set(companyId: string, feature: FeatureKey, enabled: boolean): Promise<void> {
    assertTenantId(companyId);
    await prisma.featureFlag.upsert({
      where: { companyId_feature: { companyId, feature } },
      create: { companyId, feature, enabled },
      update: { enabled },
    });
  }

  async list(companyId: string): Promise<Array<{ feature: FeatureKey; enabled: boolean }>> {
    assertTenantId(companyId);
    const flags = await prisma.featureFlag.findMany({ where: { companyId } });
    return flags.map((flag) => ({ feature: flag.feature, enabled: flag.enabled }));
  }

  async isEnabled(companyId: string, feature: FeatureKey): Promise<boolean> {
    assertTenantId(companyId);
    const flag = await prisma.featureFlag.findUnique({
      where: { companyId_feature: { companyId, feature } },
    });
    return flag?.enabled ?? false;
  }
}

export class PrismaNotificationRepository implements INotificationRepository {
  async create(data: CreateNotificationDTO): Promise<NotificationResponseDTO> {
    assertTenantId(data.companyId);
    const notification = await prisma.notification.create({
      data: {
        companyId: data.companyId,
        userId: data.userId ?? null,
        title: data.title,
        message: data.message,
        category: data.category ?? "SYSTEM",
      },
    });
    return {
      id: notification.id,
      companyId: notification.companyId,
      userId: notification.userId,
      title: notification.title,
      category: notification.category,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt,
    };
  }

  async list(companyId: string, userId?: string): Promise<NotificationResponseDTO[]> {
    assertTenantId(companyId);
    const notifications = await prisma.notification.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return notifications.map((notification) => ({
      id: notification.id,
      companyId: notification.companyId,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      read: notification.read,
      createdAt: notification.createdAt,
    }));
  }

  async markAsRead(companyId: string, id: string): Promise<void> {
    assertTenantId(companyId);
    const existing = await prisma.notification.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Notification not found");
    }
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }
}
