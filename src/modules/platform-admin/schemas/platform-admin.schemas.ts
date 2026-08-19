import { z } from "zod";

export const updateTenantSchema = z.object({
  companyId: z.string().cuid(),
  plan: z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]),
  subscriptionStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "INCOMPLETE"]),
});

export const tenantIdSchema = z.object({
  companyId: z.string().cuid(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
