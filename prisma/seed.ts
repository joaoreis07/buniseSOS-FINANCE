import { hash } from "bcryptjs";
import {
  FeatureKey,
  PrismaClient,
  type PaymentMethod,
  type TransactionStatus,
  type TransactionType,
} from "@prisma/client";

const prisma = new PrismaClient();

const FEATURES: FeatureKey[] = [
  FeatureKey.agenda,
  FeatureKey.reports,
  FeatureKey.exports,
  FeatureKey.admin,
  FeatureKey.crm,
  FeatureKey.stripe,
  FeatureKey.inventory,
];

async function seedCompany(input: {
  name: string;
  cnpj: string;
  adminEmail: string;
  managerEmail: string;
  employeeEmail: string;
  passwordHash: string;
}) {
  const company = await prisma.company.create({
    data: {
      name: input.name,
      cnpj: input.cnpj,
      phone: "(11) 4000-0000",
      address: "Av. Paulista, 1000",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      plan: "PROFESSIONAL",
      subscriptionStatus: "TRIALING",
    },
  });

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

  await prisma.featureFlag.createMany({
    data: FEATURES.map((feature) => ({
      companyId: company.id,
      feature,
      enabled: feature === FeatureKey.reports,
    })),
  });

  const [admin, manager, employee] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Isabela Admin",
        email: input.adminEmail,
        passwordHash: input.passwordHash,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Carlos Gerente",
        email: input.managerEmail,
        passwordHash: input.passwordHash,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Ana Funcionária",
        email: input.employeeEmail,
        passwordHash: input.passwordHash,
        emailVerified: new Date(),
      },
    }),
  ]);

  await prisma.membership.createMany({
    data: [
      { userId: admin.id, companyId: company.id, role: "ADMIN" },
      { userId: manager.id, companyId: company.id, role: "MANAGER" },
      { userId: employee.id, companyId: company.id, role: "EMPLOYEE" },
    ],
  });

  const incomeCategories = await Promise.all([
    prisma.category.create({
      data: {
        companyId: company.id,
        name: "Consultas",
        type: "INCOME",
        icon: "stethoscope",
        color: "#2563eb",
      },
    }),
    prisma.category.create({
      data: {
        companyId: company.id,
        name: "Avaliações",
        type: "INCOME",
        icon: "clipboard-check",
        color: "#3b82f6",
      },
    }),
  ]);

  const expenseCategories = await Promise.all([
    prisma.category.create({
      data: {
        companyId: company.id,
        name: "Aluguel",
        type: "EXPENSE",
        icon: "home",
        color: "#ef4444",
      },
    }),
    prisma.category.create({
      data: {
        companyId: company.id,
        name: "Marketing",
        type: "EXPENSE",
        icon: "megaphone",
        color: "#f59e0b",
      },
    }),
  ]);

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "Renata Costa",
        email: "renata@email.com",
        phone: "(11) 98888-1111",
        document: "123.456.789-00",
        city: "São Paulo",
        state: "SP",
        status: "ACTIVE",
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "Gabriel Lima",
        email: "gabriel@email.com",
        phone: "(11) 97777-2222",
        document: "987.654.321-00",
        city: "São Paulo",
        state: "SP",
        status: "ACTIVE",
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: "Bruna Melo",
        email: "bruna@email.com",
        phone: "(11) 96666-3333",
        city: "Campinas",
        state: "SP",
        status: "ACTIVE",
      },
    }),
  ]);

  const now = new Date();
  const txSeed: Array<{
    type: TransactionType;
    status: TransactionStatus;
    paymentMethod: PaymentMethod;
    amount: number;
    description: string;
    categoryId: string;
    customerId?: string;
    daysAgo: number;
  }> = [
    {
      type: "INCOME",
      status: "PAID",
      paymentMethod: "PIX",
      amount: 180,
      description: "Consulta nutricional",
      categoryId: incomeCategories[0].id,
      customerId: customers[0].id,
      daysAgo: 2,
    },
    {
      type: "INCOME",
      status: "PAID",
      paymentMethod: "CARD",
      amount: 150,
      description: "Avaliação física",
      categoryId: incomeCategories[1].id,
      customerId: customers[1].id,
      daysAgo: 5,
    },
    {
      type: "INCOME",
      status: "PAID",
      paymentMethod: "PIX",
      amount: 120,
      description: "Retorno",
      categoryId: incomeCategories[0].id,
      customerId: customers[2].id,
      daysAgo: 8,
    },
    {
      type: "EXPENSE",
      status: "PAID",
      paymentMethod: "TED",
      amount: 2500,
      description: "Aluguel do consultório",
      categoryId: expenseCategories[0].id,
      daysAgo: 10,
    },
    {
      type: "EXPENSE",
      status: "PENDING",
      paymentMethod: "BOLETO",
      amount: 450,
      description: "Campanha Instagram",
      categoryId: expenseCategories[1].id,
      daysAgo: 1,
    },
    {
      type: "INCOME",
      status: "OVERDUE",
      paymentMethod: "BOLETO",
      amount: 200,
      description: "Consulta pendente",
      categoryId: incomeCategories[0].id,
      customerId: customers[0].id,
      daysAgo: 20,
    },
  ];

  for (const item of txSeed) {
    const date = new Date(now);
    date.setDate(date.getDate() - item.daysAgo);
    await prisma.transaction.create({
      data: {
        companyId: company.id,
        type: item.type,
        status: item.status,
        paymentMethod: item.paymentMethod,
        amount: item.amount,
        description: item.description,
        date,
        dueDate: item.status === "PENDING" || item.status === "OVERDUE" ? date : null,
        paidAt: item.status === "PAID" ? date : null,
        categoryId: item.categoryId,
        customerId: item.customerId ?? null,
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        companyId: company.id,
        userId: admin.id,
        title: "Bem-vinda ao BusinessOS",
        message: "Sua conta demo está pronta para explorar o painel.",
      },
      {
        companyId: company.id,
        userId: admin.id,
        title: "Pagamento vencendo",
        message: "Há contas com vencimento próximo nesta semana.",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: admin.id,
      module: "seed",
      action: "CREATE",
      entity: "Company",
      entityId: company.id,
      metadata: { source: "prisma-seed" },
    },
  });

  await prisma.systemLog.create({
    data: {
      companyId: company.id,
      userId: admin.id,
      level: "INFO",
      module: "seed",
      message: `Seed concluído para ${company.name}`,
    },
  });

  return { company, admin, manager, employee, customers };
}

async function main() {
  console.log("Cleaning database...");
  await prisma.activity.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await hash("Demo@123456", 12);

  const demo = await seedCompany({
    name: "Studio Isabela Nutrição",
    cnpj: "12.345.678/0001-90",
    adminEmail: "admin@businessos.demo",
    managerEmail: "gerente@businessos.demo",
    employeeEmail: "funcionario@businessos.demo",
    passwordHash,
  });

  const other = await seedCompany({
    name: "Clínica Outra Empresa",
    cnpj: "98.765.432/0001-10",
    adminEmail: "admin@outra.demo",
    managerEmail: "gerente@outra.demo",
    employeeEmail: "funcionario@outra.demo",
    passwordHash,
  });

  console.log("Seed completed.");
  console.log("Demo company:", demo.company.id, demo.company.name);
  console.log("Other company:", other.company.id, other.company.name);
  console.log("Login demo: admin@businessos.demo / Demo@123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
