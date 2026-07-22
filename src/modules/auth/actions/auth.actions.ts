"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/shared/lib/auth";
import { getClientKey, rateLimit } from "@/shared/lib/rate-limit";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../schemas/auth.schemas";
import {
  changePassword,
  registerTenant,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from "../services/auth.service";

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

async function clientIp(): Promise<string> {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown"
  );
}

function limitOrThrow(prefix: string, ip: string, limit: number, windowMs: number): void {
  const result = rateLimit(getClientKey(prefix, ip), limit, windowMs);
  if (!result.success) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  }
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  try {
    const ip = await clientIp();
    limitOrThrow("login", ip, 10, 15 * 60 * 1000);

    const data = loginSchema.parse(input);
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    return { success: true, message: "Login realizado com sucesso" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "E-mail ou senha inválidos" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível entrar",
    };
  }
}

/** One-click demo access for the landing page (seed account). */
export async function demoLoginAction(): Promise<ActionResult> {
  try {
    const ip = await clientIp();
    limitOrThrow("demo-login", ip, 20, 15 * 60 * 1000);

    await signIn("credentials", {
      email: "admin@businessos.demo",
      password: "Demo@123456",
      redirect: false,
    });

    return { success: true, message: "Demonstração iniciada" };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: "Conta demo indisponível. Rode pnpm db:seed e tente de novo.",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível abrir a demonstração",
    };
  }
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  try {
    const ip = await clientIp();
    limitOrThrow("register", ip, 5, 60 * 60 * 1000);

    const data = registerSchema.parse(input);
    const created = await registerTenant(data);

    await signIn("credentials", {
      email: created.email,
      password: data.password,
      redirect: false,
    });

    return {
      success: true,
      message: "Conta criada. Verifique seu e-mail para confirmar o cadastro.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível criar a conta",
    };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  await signOut({ redirect: false });
  return { success: true };
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const ip = await clientIp();
    limitOrThrow("forgot", ip, 5, 60 * 60 * 1000);

    const data = forgotPasswordSchema.parse(input);
    await requestPasswordReset(data.email);

    return {
      success: true,
      message: "Se o e-mail existir, enviaremos um link para redefinir a senha.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível enviar o e-mail",
    };
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const ip = await clientIp();
    limitOrThrow("reset", ip, 5, 60 * 60 * 1000);

    const data = resetPasswordSchema.parse(input);
    await resetPasswordWithToken(data.token, data.password);

    return { success: true, message: "Senha redefinida com sucesso" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível redefinir a senha",
    };
  }
}

export async function verifyEmailAction(input: unknown): Promise<ActionResult> {
  try {
    const ip = await clientIp();
    limitOrThrow("verify", ip, 10, 60 * 60 * 1000);

    const data = verifyEmailSchema.parse(input);
    await verifyEmailWithToken(data.token);

    return { success: true, message: "E-mail verificado com sucesso" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível verificar o e-mail",
    };
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autenticado" };
    }

    const ip = await clientIp();
    limitOrThrow("change-password", ip, 5, 60 * 60 * 1000);

    const data = changePasswordSchema.parse(input);
    await changePassword(session.user.id, data.currentPassword, data.newPassword);

    return { success: true, message: "Senha alterada com sucesso" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível alterar a senha",
    };
  }
}
