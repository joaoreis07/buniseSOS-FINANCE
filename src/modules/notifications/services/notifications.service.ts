import type { NotificationCategory } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";

/** Internal-only — not exposed as a server action. */
export async function createCompanyNotificationInternal(params: {
  companyId: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  userId?: string | null;
}): Promise<void> {
  assertTenantId(params.companyId);
  await prisma.notification.create({
    data: {
      companyId: params.companyId,
      userId: params.userId ?? null,
      title: params.title,
      message: params.message,
      category: params.category ?? "SYSTEM",
    },
  });
}
