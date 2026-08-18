import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await readAuthToken(request);

  const isLoggedIn = Boolean(token);
  const isAppRoute = pathname.startsWith("/app") || pathname.startsWith("/change-password");
  const isAuthPage = authPages.has(pathname);

  if (isAppRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isLoggedIn && pathname !== "/verify-email") {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/change-password",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
};
