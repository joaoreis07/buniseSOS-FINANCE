"use server";

import type { NotificationCategory } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requirePermission, requireSession } from "@/shared/lib/session";

export type NotificationItemDTO = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;
};

export async function listNotificationsAction(filter?: {
  category?: NotificationCategory | "ALL";
}): Promise<NotificationItemDTO[]> {
  const user = await requireSession();
  const category = filter?.category && filter.category !== "ALL" ? filter.category : undefined;
  const items = await prisma.notification.findMany({
    where: {
      companyId: user.companyId,
      deletedAt: null,
      OR: [{ userId: user.id }, { userId: null }],
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    category: item.category,
    read: item.read,
    createdAt: item.createdAt.toISOString(),
  }));
}

export async function markNotificationReadAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireSession();
    await prisma.notification.updateMany({
      where: { id, companyId: user.companyId, deletedAt: null },
      data: { read: true },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Não foi possível marcar como lida" };
  }
}

export async function markAllNotificationsReadAction(): Promise<{ success: boolean }> {
  const user = await requireSession();
  await prisma.notification.updateMany({
    where: {
      companyId: user.companyId,
      deletedAt: null,
      read: false,
      OR: [{ userId: user.id }, { userId: null }],
    },
    data: { read: true },
  });
  return { success: true };
}

export async function deleteNotificationAction(id: string): Promise<{ success: boolean }> {
  const user = await requirePermission("settings:view");
  await prisma.notification.updateMany({
    where: { id, companyId: user.companyId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return { success: true };
}
