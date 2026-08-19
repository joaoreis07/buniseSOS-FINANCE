import type { Plan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

export type PlatformCompanyRow = {
  id: string;
  name: string;
  cnpj: string | null;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  deletedAt: Date | null;
  memberships: Array<{
    role: string;
    deletedAt: Date | null;
    user: { name: string | null; email: string; deletedAt: Date | null };
  }>;
  _count: { customers: number; memberships: number };
};

export interface IPlatformAdminRepository {
  listCompanies(): Promise<PlatformCompanyRow[]>;
  findCompany(id: string): Promise<PlatformCompanyRow | null>;
  updateCompany(
    id: string,
    data: { plan: Plan; subscriptionStatus: SubscriptionStatus },
  ): Promise<void>;
  softRemoveCompany(id: string): Promise<void>;
  restoreCompany(id: string): Promise<void>;
}

export class PrismaPlatformAdminRepository implements IPlatformAdminRepository {
  async listCompanies(): Promise<PlatformCompanyRow[]> {
    return prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: {
            user: { select: { name: true, email: true, deletedAt: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            customers: { where: { deletedAt: null } },
            memberships: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async findCompany(id: string): Promise<PlatformCompanyRow | null> {
    return prisma.company.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: {
            user: { select: { name: true, email: true, deletedAt: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            customers: { where: { deletedAt: null } },
            memberships: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async updateCompany(
    id: string,
    data: { plan: Plan; subscriptionStatus: SubscriptionStatus },
  ): Promise<void> {
    await prisma.company.update({
      where: { id },
      data: {
        plan: data.plan,
        subscriptionStatus: data.subscriptionStatus,
      },
    });
  }

  async softRemoveCompany(id: string): Promise<void> {
    await prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        subscriptionStatus: "CANCELED",
      },
    });
  }

  async restoreCompany(id: string): Promise<void> {
    await prisma.company.update({
      where: { id },
      data: {
        deletedAt: null,
        subscriptionStatus: "TRIALING",
      },
    });
  }
}
