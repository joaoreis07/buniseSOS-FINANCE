import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/modules/auth/components/login-form";
import { auth } from "@/shared/lib/auth";

function safeCallbackUrl(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }
  return value;
}

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const session = await auth();

  if (
    session?.user?.id &&
    session.user.companyId &&
    session.user.role
  ) {
    redirect(callbackUrl);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <LoginForm />
    </Suspense>
  );
}
