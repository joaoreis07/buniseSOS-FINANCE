import { Suspense } from "react";
import { VerifyEmailClient } from "@/modules/auth/components/verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
