import { FeatureKey, type Role } from "@prisma/client";
import { hash, compare } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/shared/lib/prisma";
import { sendEmail } from "@/shared/lib/email";
import type { RegisterInput } from "../schemas/auth.schemas";

const FEATURES: FeatureKey[] = [
  FeatureKey.agenda,
  FeatureKey.reports,
  FeatureKey.exports,
  FeatureKey.admin,
  FeatureKey.crm,
  FeatureKey.stripe,
  FeatureKey.inventory,
];

function appUrl(): string {
  return process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function createVerificationToken(identifier: string, hours = 24): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return token;
}

export async function consumeVerificationToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) {
    return null;
  }
  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }
  await prisma.verificationToken.delete({ where: { token } });
  return record.identifier;
}

export type AuthMembership = {
  companyId: string;
  role: Role;
};

export async function getPrimaryMembership(userId: string): Promise<AuthMembership | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    return null;
  }
  return { companyId: membership.companyId, role: membership.role };
}

export async function registerTenant(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), deletedAt: null },
  });
  if (existing) {
    throw new Error("Este e-mail já está cadastrado");
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
      },
    });

    const company = await tx.company.create({
      data: {
        name: input.companyName,
        plan: "STARTER",
        subscriptionStatus: "TRIALING",
      },
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: "ADMIN",
      },
    });

    await tx.companySettings.create({
      data: {
        companyId: company.id,
        theme: "light",
        language: "pt-BR",
        currency: "BRL",
        timezone: "America/Sao_Paulo",
        dateFormat: "dd/MM/yyyy",
        notifications: true,
        monthlyGoal: 0,
      },
    });

    await tx.featureFlag.createMany({
      data: FEATURES.map((feature) => ({
        companyId: company.id,
        feature,
        enabled: feature === FeatureKey.reports,
      })),
    });

    await tx.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        module: "auth",
        action: "REGISTER",
        entity: "User",
        entityId: user.id,
        metadata: { companyName: company.name },
      },
    });

    return { user, company };
  });

  const token = await createVerificationToken(`verify:${result.user.email}`, 48);
  const verifyLink = `${appUrl()}/verify-email?token=${token}`;

  await sendEmail({
    to: result.user.email,
    subject: "Confirme seu e-mail — BusinessOS",
    html: `<p>Olá ${result.user.name ?? ""},</p><p>Confirme seu e-mail clicando no link:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`,
    text: `Confirme seu e-mail: ${verifyLink}`,
  });

  return {
    userId: result.user.id,
    email: result.user.email,
    companyId: result.company.id,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  // Always succeed to avoid account enumeration
  if (!user) {
    return;
  }

  const token = await createVerificationToken(`reset:${user.email}`, 1);
  const resetLink = `${appUrl()}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Redefinir senha — BusinessOS",
    html: `<p>Olá,</p><p>Use o link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    text: `Redefinir senha: ${resetLink}`,
  });
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const identifier = await consumeVerificationToken(token);
  if (!identifier || !identifier.startsWith("reset:")) {
    throw new Error("Token inválido ou expirado");
  }

  const email = identifier.replace("reset:", "");
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      module: "auth",
      action: "RESET_PASSWORD",
      entity: "User",
      entityId: user.id,
    },
  });
}

export async function verifyEmailWithToken(token: string): Promise<void> {
  const identifier = await consumeVerificationToken(token);
  if (!identifier || !identifier.startsWith("verify:")) {
    throw new Error("Token inválido ou expirado");
  }

  const email = identifier.replace("verify:", "");
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user?.passwordHash) {
    throw new Error("Usuário não encontrado");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Senha atual incorreta");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      module: "auth",
      action: "CHANGE_PASSWORD",
      entity: "User",
      entityId: user.id,
    },
  });
}
