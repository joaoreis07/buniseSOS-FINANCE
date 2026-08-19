import { NextResponse } from "next/server";
import { hasPermission, type Permission } from "@/shared/lib/rbac";
import { getValidatedSessionUser, type AppSessionUser } from "@/shared/lib/session";

export type ApiAuthResult =
  | { ok: true; user: AppSessionUser }
  | { ok: false; response: NextResponse };

const unauthorized = NextResponse.json({ error: "Não autenticado" }, { status: 401 });

/**
 * Resolves an API caller with live membership validation (not JWT role/tenant alone).
 * Returns 401 when session is missing, invalidated, or membership/company is gone.
 */
export async function resolveApiSession(): Promise<ApiAuthResult> {
  const user = await getValidatedSessionUser();
  if (!user) {
    return { ok: false, response: unauthorized };
  }
  return { ok: true, user };
}

/** Same as resolveApiSession, plus RBAC using the current role from the database. */
export async function resolveApiPermission(permission: Permission): Promise<ApiAuthResult> {
  const sessionResult = await resolveApiSession();
  if (!sessionResult.ok) {
    return sessionResult;
  }
  if (!hasPermission(sessionResult.user.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sem permissão" }, { status: 403 }),
    };
  }
  return sessionResult;
}
