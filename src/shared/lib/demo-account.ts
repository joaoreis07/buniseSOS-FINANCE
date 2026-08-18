/** Seed / landing demo tenants use @businessos.demo emails. */
export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized === "admin@businessos.demo" || normalized.endsWith("@businessos.demo")
  );
}

/**
 * Demo login is disabled in production unless ENABLE_DEMO=true.
 * In non-production environments it stays enabled unless ENABLE_DEMO=false.
 */
export function isDemoLoginEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return process.env.ENABLE_DEMO === "true";
  }
  return process.env.ENABLE_DEMO !== "false";
}
