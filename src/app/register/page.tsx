import { redirect } from "next/navigation";
import { RegisterForm } from "@/modules/auth/components/register-form";
import { auth } from "@/shared/lib/auth";

export default async function RegisterPage() {
  const session = await auth();
  if (
    session?.user?.id &&
    session.user.companyId &&
    session.user.role
  ) {
    redirect("/app");
  }

  return <RegisterForm />;
}
