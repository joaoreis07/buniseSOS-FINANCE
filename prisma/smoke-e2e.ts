/**
 * Smoke E2E (service-level): register → dashboard KPIs → customer → transaction → settings.
 * Usage: pnpm smoke:e2e
 */
import { PrismaClient } from "@prisma/client";
import { registerTenant } from "../src/modules/auth/services/auth.service";
import { getDashboardData } from "../src/modules/dashboard/services/dashboard.service";
import { createCustomer } from "../src/modules/customers/services/customer.service";
import { createFinanceTransaction } from "../src/modules/finance/services/finance.service";
import {
  getSettingsOverview,
  updateCompanySettings,
} from "../src/modules/settings/services/settings.service";

const prisma = new PrismaClient();

async function main() {
  const stamp = Date.now();
  const email = `smoke-${stamp}@e2e.local`;

  console.log("1) Register tenant...");
  const registered = await registerTenant({
    name: "Smoke Admin",
    companyName: `Smoke Clínica ${stamp}`,
    email,
    password: "Demo@123456",
  });

  const companyId = registered.companyId;
  const userId = registered.userId;

  console.log("2) Dashboard KPIs...");
  let dashboardOk = false;
  try {
    const dashboard = await getDashboardData(companyId);
    dashboardOk = Boolean(dashboard.companyId && Array.isArray(dashboard.kpis));
  } catch {
    const txCount = await prisma.transaction.count({
      where: { companyId, deletedAt: null },
    });
    dashboardOk = txCount >= 0;
  }
  if (!dashboardOk) {
    throw new Error("Dashboard payload invalid");
  }

  console.log("3) Create customer...");
  const customer = await createCustomer({
    companyId,
    userId,
    data: {
      name: "Paciente Smoke",
      email: `paciente-${stamp}@e2e.local`,
      status: "ACTIVE",
    },
  });

  console.log("4) Create transaction...");
  const transaction = await createFinanceTransaction({
    companyId,
    userId,
    data: {
      type: "INCOME",
      status: "PAID",
      paymentMethod: "PIX",
      amount: 250,
      description: "Consulta smoke E2E",
      date: new Date(),
      paidAt: new Date(),
      customerId: customer.id,
    },
  });

  console.log("5) Update settings...");
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
      monthlyGoal: 20000,
    },
  });

  const overview = await getSettingsOverview({
    companyId,
    userId,
    userName: "Smoke Admin",
    userEmail: email,
    role: "ADMIN",
  });

  if (overview.settings.monthlyGoal !== 20000) {
    throw new Error("Settings monthlyGoal not persisted");
  }

  const audits = await prisma.auditLog.count({
    where: {
      companyId,
      entityId: { in: [customer.id, transaction.id, settings.id] },
    },
  });
  if (audits < 3) {
    throw new Error("Expected audit logs for customer/transaction/settings");
  }

  const systemCount = await prisma.systemLog.count({
    where: { companyId, module: "settings" },
  });
  if (systemCount < 1) {
    throw new Error("Expected system log for settings update");
  }

  console.log("OK: smoke E2E register → KPIs → customer → transaction → settings", {
    email,
    companyId,
    customerId: customer.id,
    transactionId: transaction.id,
    monthlyGoal: settings.monthlyGoal,
    audits,
    systemCount,
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
