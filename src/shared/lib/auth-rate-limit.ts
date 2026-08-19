import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientKey, rateLimit } from "@/shared/lib/rate-limit";

/** Single counter for credential login: 10 attempts per IP per 15 minutes. */
export const LOGIN_RATE_LIMIT = 10;
export const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

function clientIpFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Rate-limit credential login on /api/auth/callback/credentials.
 * Counts once per request — authorize() must NOT duplicate this counter.
 */
export function rateLimitCredentialsLogin(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  if (!pathname.endsWith("/callback/credentials")) {
    return null;
  }

  const result = rateLimit(
    getClientKey("login", clientIpFromRequest(request)),
    LOGIN_RATE_LIMIT,
    LOGIN_RATE_WINDOW_MS,
  );
  if (!result.success) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429 },
    );
  }

  return null;
}
