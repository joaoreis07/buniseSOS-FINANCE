/**
 * Stage 8 validation: settings upsert, notifications, audit/system logs.
 */
import { PrismaClient } from "@prisma/client";
import {
  getSettingsOverview,
  markNotificationRead,
  updateCompanyProfile,
  updateCompanySettings,
} from "../src/modules/settings/services/settings.service";

const prisma = new PrismaClient();

async function main() {
  const membership = await prisma.membership.findFirst({
    where: {
      deletedAt: null,
      user: { email: "admin@businessos.demo", deletedAt: null },
    },
    include: { user: true, company: true },
  });
  if (!membership) {
    throw new Error("Demo admin membership missing. Run pnpm db:seed.");
  }

  const companyId = membership.companyId;
  const userId = membership.userId;

  const before = await getSettingsOverview({
    companyId,
    userId,
    userName: membership.user.name,
    userEmail: membership.user.email,
    role: membership.role,
  });

  const profile = await updateCompanyProfile({
    companyId,
    userId,
    data: {
      name: before.company.name,
      cnpj: before.company.cnpj ?? "12.345.678/0001-90",
      phone: before.company.phone ?? "(11) 99999-0000",
      address: before.company.address ?? "Rua Smoke, 100",
      city: before.company.city ?? "São Paulo",
      state: before.company.state ?? "SP",
      zipCode: before.company.zipCode ?? "01000-000",
    },
  });

  const settings = await updateCompanySettings({
    companyId,
    userId,
    data: {
      theme: "light",
      language: "pt-BR",
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      dateFormat: "dd/MM/yyyy",
      notifications: true,
      monthlyGoal: Math.max(1000, before.settings.monthlyGoal),
    },
  });

  if (profile.id !== companyId) {
    throw new Error("Company profile update failed");
  }
  if (settings.companyId !== companyId) {
    throw new Error("Company settings update failed");
  }

  const notification = await prisma.notification.findFirst({
    where: { companyId, deletedAt: null, read: false },
  });
  if (notification) {
    await markNotificationRead({ companyId, userId, id: notification.id });
  }

  const auditCount = await prisma.auditLog.count({
    where: { companyId, module: "settings" },
  });
  const systemCount = await prisma.systemLog.count({
    where: { companyId, module: "settings" },
  });

  if (auditCount < 1 || systemCount < 1) {
    throw new Error("Expected settings audit and system logs");
  }

  console.log("OK: settings profile + preferences + notifications + logs", {
    auditCount,
    systemCount,
    monthlyGoal: settings.monthlyGoal,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
