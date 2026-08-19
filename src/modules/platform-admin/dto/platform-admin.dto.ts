import type { Plan, SubscriptionStatus } from "@prisma/client";

export type PlatformTenantDTO = {
  id: string;
  name: string;
  cnpj: string | null;
  plan: Plan;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  statusLabel: string;
  createdAt: string;
  createdAtLabel: string;
  deletedAt: string | null;
  isRemoved: boolean;
  ownerName: string | null;
  ownerEmail: string | null;
  userCount: number;
  customerCount: number;
};

export type PlatformAdminOverviewDTO = {
  totals: {
    companies: number;
    active: number;
    trialing: number;
    paid: number;
    canceled: number;
    removed: number;
    newThisWeek: number;
  };
  tenants: PlatformTenantDTO[];
};
