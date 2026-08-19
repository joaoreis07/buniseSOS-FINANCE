import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { isDemoAccountEmail } from "@/shared/lib/demo-account";

const authPages = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

function sessionCookieNames(secureCookie: boolean): string[] {
  if (secureCookie) {
    return ["__Secure-authjs.session-token", "__Secure-next-auth.session-token"];
  }
  return ["authjs.session-token", "next-auth.session-token"];
}

/** Auth.js v5 cookies are not the v4 default; AUTH_URL=localhost would also pick the wrong name. */
async function readAuthToken(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const secureCookie = request.nextUrl.protocol === "https:";

  for (const cookieName of sessionCookieNames(secureCookie)) {
    const token = await getToken({
      req: request,
      secret,
      secureCookie,
      cookieName,
      salt: cookieName,
    });
    if (token) {
      return token;
    }
  }

  return null;
}

function clearAuthSessionCookies(response: NextResponse, request: NextRequest) {
  const secureCookie = request.nextUrl.protocol === "https:";
  for (const cookie of request.cookies.getAll()) {
    const name = cookie.name;
    if (
      !name.includes("authjs.session-token") &&
      !name.includes("next-auth.session-token")
    ) {
      continue;
    }
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      secure: secureCookie,
      httpOnly: true,
      sameSite: "lax",
    });
  }
}

function hasAuthSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) =>
      c.name.includes("authjs.session-token") ||
      c.name.includes("next-auth.session-token"),
  );
}

function isActiveToken(token: JWT | null): boolean {
  return Boolean(
    token?.sub &&
      typeof token.companyId === "string" &&
      typeof token.role === "string" &&
      !token.invalidated,
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawToken = await readAuthToken(request);
  const token = rawToken && typeof rawToken === "object" ? (rawToken as JWT) : null;
  const isLoggedIn = isActiveToken(token);
  const isDemo = isDemoAccountEmail(
    typeof token?.email === "string" ? token.email : null,
  );
  const isAppRoute =
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/change-password");
  const isAuthPage = authPages.has(pathname);

  if (isAppRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Demo session must not trap users: allow leaving to create/login a real account.
  if (
    isLoggedIn &&
    isDemo &&
    (pathname === "/register" || pathname === "/login" || pathname === "/criar-conta")
  ) {
    const response =
      pathname === "/criar-conta"
        ? NextResponse.redirect(new URL("/register", request.url))
        : NextResponse.next();
    clearAuthSessionCookies(response, request);
    return response;
  }

  if (isAuthPage && !isLoggedIn && hasAuthSessionCookie(request)) {
    const response = NextResponse.next();
    clearAuthSessionCookies(response, request);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin",
    "/admin/:path*",
    "/change-password",
    "/login",
    "/register",
    "/criar-conta",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
};
