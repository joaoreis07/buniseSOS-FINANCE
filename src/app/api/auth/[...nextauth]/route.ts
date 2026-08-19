import type { NextRequest } from "next/server";
import { handlers } from "@/shared/lib/auth";
import { rateLimitCredentialsLogin } from "@/shared/lib/auth-rate-limit";

const { GET, POST: authPost } = handlers;

export { GET };

export async function POST(request: NextRequest) {
  const limited = rateLimitCredentialsLogin(request);
  if (limited) {
    return limited;
  }
  return authPost(request);
}
