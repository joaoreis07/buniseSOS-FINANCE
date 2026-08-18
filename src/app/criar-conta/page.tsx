import { redirect } from "next/navigation";
import { auth, signOut } from "@/shared/lib/auth";
import { isDemoAccountEmail } from "@/shared/lib/demo-account";

/**
 * Gateway for every “create account” CTA.
 * If the visitor is still in the demo session, exit demo first so /register
 * is not bounced back to /app by middleware.
 */
export default async function CriarContaPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (isDemoAccountEmail(email)) {
    await signOut({ redirectTo: "/register" });
  }

  if (session?.user) {
    redirect("/app");
  }

  redirect("/register");
}
