import type { Role } from "@prisma/client";

export type TenantContext = {
  companyId: string;
  userId: string;
  role: Role;
};

export function assertTenantId(companyId: string | null | undefined): asserts companyId is string {
  if (!companyId || companyId.trim().length === 0) {
    throw new Error("Tenant companyId is required");
  }
}

export const notDeletedFilter = { deletedAt: null } as const;
