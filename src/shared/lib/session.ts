import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/shared/lib/auth";
import { assertPermission, hasPermission, type Permission } from "@/shared/lib/rbac";

export type AppSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  companyId: string;
  role: Role;
  emailVerified: Date | null;
};

export async function requireSession(): Promise<AppSessionUser> {
  const session = await auth();
  if (!session?.user?.id || !session.user.companyId || !session.user.role) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    companyId: session.user.companyId,
    role: session.user.role,
    emailVerified: session.user.emailVerified ?? null,
  };
}

export async function requirePermission(permission: Permission): Promise<AppSessionUser> {
  const user = await requireSession();
  if (!hasPermission(user.role, permission)) {
    redirect("/app");
  }
  assertPermission(user.role, permission);
  return user;
}

export function getUserInitials(name: string | null, email: string | null): string {
  if (name && name.trim().length > 0) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function getFirstName(name: string | null): string {
  if (!name) {
    return "usuário";
  }
  return name.trim().split(/\s+/)[0] ?? "usuário";
}
