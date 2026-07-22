import type { FeatureKey } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";

export async function getFeatureFlags(
  companyId: string,
): Promise<Record<FeatureKey, boolean>> {
  assertTenantId(companyId);
  const flags = await prisma.featureFlag.findMany({ where: { companyId } });

  const defaults: Record<FeatureKey, boolean> = {
    agenda: false,
    reports: false,
    exports: false,
    admin: false,
    crm: false,
    stripe: false,
    inventory: false,
  };

  for (const flag of flags) {
    defaults[flag.feature] = flag.enabled;
  }

  return defaults;
}

export async function isFeatureEnabled(
  companyId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const flags = await getFeatureFlags(companyId);
  return flags[feature];
}
