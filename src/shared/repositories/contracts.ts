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
import type { FeatureKey, LogLevel, Role } from "@prisma/client";

export interface IUserRepository {
  create(data: CreateUserDTO): Promise<UserResponseDTO>;
  update(id: string, data: UpdateUserDTO): Promise<UserResponseDTO>;
  softDelete(id: string): Promise<void>;
  findById(id: string): Promise<UserResponseDTO | null>;
  findByEmail(email: string): Promise<(UserResponseDTO & { passwordHash: string | null }) | null>;
}

export interface ICompanyRepository {
  create(data: CreateCompanyDTO): Promise<CompanyResponseDTO>;
  update(id: string, data: UpdateCompanyDTO): Promise<CompanyResponseDTO>;
  softDelete(id: string): Promise<void>;
  findById(id: string): Promise<CompanyResponseDTO | null>;
}

export interface ICompanySettingsRepository {
  upsert(
    companyId: string,
    data: UpdateCompanySettingsDTO,
  ): Promise<CompanySettingsResponseDTO>;
  findByCompanyId(companyId: string): Promise<CompanySettingsResponseDTO | null>;
}

export interface IMembershipRepository {
  create(userId: string, companyId: string, role: Role): Promise<{ id: string }>;
  findByUserAndCompany(
    userId: string,
    companyId: string,
  ): Promise<{ id: string; role: Role } | null>;
}

export type CreateAuditLogDTO = {
  companyId?: string | null;
  userId?: string | null;
  module: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

export interface IAuditLogRepository {
  create(data: CreateAuditLogDTO): Promise<{ id: string }>;
  list(
    companyId: string,
    params?: { page?: number; pageSize?: number; module?: string },
  ): Promise<{ items: AuditLogItemDTO[]; total: number }>;
}

export type AuditLogItemDTO = {
  id: string;
  companyId: string | null;
  userId: string | null;
  module: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: Date;
  userName?: string | null;
};

export type CreateSystemLogDTO = {
  companyId?: string | null;
  userId?: string | null;
  level: LogLevel;
  module: string;
  message: string;
  ip?: string | null;
  browser?: string | null;
};

export type SystemLogItemDTO = {
  id: string;
  companyId: string | null;
  userId: string | null;
  level: LogLevel;
  module: string;
  message: string;
  ip: string | null;
  browser: string | null;
  createdAt: Date;
};

export interface ISystemLogRepository {
  create(data: CreateSystemLogDTO): Promise<{ id: string }>;
  list(
    companyId: string,
    params?: { page?: number; pageSize?: number },
  ): Promise<{ items: SystemLogItemDTO[]; total: number }>;
}

export interface IFeatureFlagRepository {
  set(companyId: string, feature: FeatureKey, enabled: boolean): Promise<void>;
  list(companyId: string): Promise<Array<{ feature: FeatureKey; enabled: boolean }>>;
  isEnabled(companyId: string, feature: FeatureKey): Promise<boolean>;
}

export type CreateNotificationDTO = {
  companyId: string;
  userId?: string | null;
  title: string;
  message: string;
  category?: "FINANCE" | "CUSTOMERS" | "SYSTEM" | "INSTALLMENTS";
};

export type NotificationResponseDTO = {
  id: string;
  companyId: string;
  userId: string | null;
  title: string;
  category?: "FINANCE" | "CUSTOMERS" | "SYSTEM" | "INSTALLMENTS";
  message: string;
  read: boolean;
  createdAt: Date;
};

export interface INotificationRepository {
  create(data: CreateNotificationDTO): Promise<NotificationResponseDTO>;
  list(companyId: string, userId?: string): Promise<NotificationResponseDTO[]>;
  markAsRead(companyId: string, id: string): Promise<void>;
}
