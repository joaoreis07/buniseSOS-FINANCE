/**
 * Smoke verification: dashboard KPIs resolve for seeded tenant.
 * Usage: npx tsx prisma/verify-dashboard.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

async function main() {
  const membership = await prisma.membership.findFirst({
    where: {
      deletedAt: null,
      user: { email: "admin@businessos.demo", deletedAt: null },
      company: { deletedAt: null },
    },
    include: { company: true },
  });

  const company = membership?.company;
  if (!company) {
    throw new Error(
      "Demo company for admin@businessos.demo not found. Run pnpm db:seed first.",
    );
  }

  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);

  const [income, expense, customers, notifications, settings] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        companyId: company.id,
        deletedAt: null,
        status: "PAID",
        type: "INCOME",
        date: { gte: currentStart, lte: currentEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        companyId: company.id,
        deletedAt: null,
        status: "PAID",
        type: "EXPENSE",
        date: { gte: currentStart, lte: currentEnd },
      },
      _sum: { amount: true },
    }),
    prisma.customer.count({
      where: { companyId: company.id, deletedAt: null, status: "ACTIVE" },
    }),
    prisma.notification.count({
      where: { companyId: company.id, deletedAt: null },
    }),
    prisma.companySettings.findUnique({ where: { companyId: company.id } }),
  ]);

  const revenue = income._sum.amount ? Number(income._sum.amount) : 0;
  const expenses = expense._sum.amount ? Number(expense._sum.amount) : 0;
  const profit = revenue - expenses;
  const goal = settings ? Number(settings.monthlyGoal) : 0;

  console.log("Dashboard seed KPIs (businessos-demo)");
  console.log({
    companyId: company.id,
    revenueMonth: revenue,
    expensesMonth: expenses,
    netProfitMonth: profit,
    activeCustomers: customers,
    notifications,
    monthlyGoal: goal,
  });

  if (customers < 1) {
    throw new Error("Expected seeded active customers");
  }
  if (goal <= 0) {
    throw new Error("Expected monthlyGoal in company settings");
  }
  if (notifications < 1) {
    throw new Error("Expected seeded notifications");
  }

  // Seed uses relative dates; at least some paid history should exist across months
  const paidCount = await prisma.transaction.count({
    where: { companyId: company.id, deletedAt: null, status: "PAID" },
  });
  if (paidCount < 1) {
    throw new Error("Expected seeded paid transactions");
  }

  console.log("OK: dashboard data available for Stage 5");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
