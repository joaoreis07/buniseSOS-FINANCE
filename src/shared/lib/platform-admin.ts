import { requireSession, type AppSessionUser } from "@/shared/lib/session";
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Comma-separated allowlist, e.g. PLATFORM_ADMIN_EMAILS=you@example.com */
export function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter((item) => item.length > 0);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getPlatformAdminEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(normalizeEmail(email));
}

export async function requirePlatformAdmin(): Promise<AppSessionUser> {
  const user = await requireSession();
  if (getPlatformAdminEmails().length === 0) {
    throw new Error("PLATFORM_ADMIN_EMAILS não configurado");
  }
  if (!isPlatformAdminEmail(user.email)) {
    throw new Error("Acesso negado ao console admin da plataforma");
  }
  return user;
}
