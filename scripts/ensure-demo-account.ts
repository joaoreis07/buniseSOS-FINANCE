/**
 * Ensures landing demo accounts exist without wiping production data.
 * Usage: tsx scripts/ensure-demo-account.ts
 */
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo@123456";
const DEMO_COMPANY_CNPJ = "12.345.678/0001-90";
const DEMO_COMPANY_NAME = "Studio Isabela Nutrição";

const DEMO_USERS = [
  { name: "Isabela Admin", email: "admin@businessos.demo", role: "ADMIN" as const },
  { name: "Carlos Gerente", email: "gerente@businessos.demo", role: "MANAGER" as const },
  { name: "Ana Funcionária", email: "funcionario@businessos.demo", role: "EMPLOYEE" as const },
];

async function ensureDemoCompany() {
  let company = await prisma.company.findFirst({
    where: { cnpj: DEMO_COMPANY_CNPJ, deletedAt: null },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: DEMO_COMPANY_NAME,
        cnpj: DEMO_COMPANY_CNPJ,
        phone: "(11) 4000-0000",
        address: "Av. Paulista, 1000",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-100",
        plan: "PROFESSIONAL",
        subscriptionStatus: "TRIALING",
      },
    });
    console.log("CREATED demo company:", company.id);
  } else {
    console.log("OK demo company:", company.id);
  }

  const settings = await prisma.companySettings.findFirst({
    where: { companyId: company.id },
  });
  if (!settings) {
    await prisma.companySettings.create({
      data: {
        companyId: company.id,
        theme: "light",
        language: "pt-BR",
        currency: "BRL",
        timezone: "America/Sao_Paulo",
        dateFormat: "dd/MM/yyyy",
        notifications: true,
        monthlyGoal: 15000,
      },
    });
    console.log("CREATED demo company settings");
  }

  return company;
}

async function ensureDemoUser(
  companyId: string,
  input: { name: string; email: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE" },
  passwordHash: string,
) {
  let user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
    include: {
      memberships: { where: { deletedAt: null, companyId } },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        emailVerified: new Date(),
        sessionVersion: 0,
      },
      include: {
        memberships: { where: { deletedAt: null, companyId } },
      },
    });
    console.log("CREATED demo user:", input.email);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, emailVerified: user.emailVerified ?? new Date() },
    });
    console.log("OK demo user:", input.email);
  }

  if (user.memberships.length === 0) {
    await prisma.membership.create({
      data: { userId: user.id, companyId, role: input.role },
    });
    console.log("ADDED membership:", input.email, input.role);
  }
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO !== "true") {
    console.log("ENABLE_DEMO is not true; skipping demo account ensure.");
    return;
  }

  const passwordHash = await hash(DEMO_PASSWORD, 12);
  const company = await ensureDemoCompany();

  for (const demoUser of DEMO_USERS) {
    await ensureDemoUser(company.id, demoUser, passwordHash);
  }

  console.log("Demo login ready: admin@businessos.demo / Demo@123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
