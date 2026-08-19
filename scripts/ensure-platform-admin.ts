/**
 * Ensures platform admin user(s) from PLATFORM_ADMIN_EMAILS exist with membership.
 * Usage: npx tsx scripts/ensure-platform-admin.ts [password]
 */
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function adminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  const emails = adminEmails();
  if (emails.length === 0) {
    console.error("PLATFORM_ADMIN_EMAILS is empty. Set it in .env first.");
    process.exit(1);
  }

  const password = process.argv[2] ?? "Admin@123456";
  const passwordHash = await hash(password, 12);

  for (const email of emails) {
    let user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        memberships: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!user) {
      const company = await prisma.company.create({
        data: {
          name: "Platform Admin Org",
          cnpj: `pa${Date.now()}`.slice(0, 14).padStart(14, "0"),
          plan: "ENTERPRISE",
          subscriptionStatus: "ACTIVE",
          settings: { create: {} },
        },
      });

      user = await prisma.user.create({
        data: {
          name: "Platform Admin",
          email,
          passwordHash,
          emailVerified: new Date(),
          sessionVersion: 0,
          memberships: {
            create: { companyId: company.id, role: "ADMIN" },
          },
        },
        include: {
          memberships: { where: { deletedAt: null }, take: 1 },
        },
      });
      console.log(`CREATED user ${email} / password: ${password}`);
      continue;
    }

    if (user.memberships.length === 0) {
      const company = await prisma.company.create({
        data: {
          name: "Platform Admin Org",
          cnpj: `pa${Date.now()}`.slice(0, 14).padStart(14, "0"),
          plan: "ENTERPRISE",
          subscriptionStatus: "ACTIVE",
          settings: { create: {} },
        },
      });
      await prisma.membership.create({
        data: { userId: user.id, companyId: company.id, role: "ADMIN" },
      });
      console.log(`ADDED membership for ${email}`);
    } else {
      console.log(`OK user exists: ${email}`);
    }

    if (process.argv[2]) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      console.log(`UPDATED password for ${email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
