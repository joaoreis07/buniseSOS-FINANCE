import Link from "next/link";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { Button } from "@/shared/components/ui/button";

export function PlatformAdminForbidden({
  userEmail,
}: {
  userEmail: string | null;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Acesso ao console admin</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        A rota <code className="rounded bg-white px-1.5 py-0.5">/admin</code> é o console da{" "}
        <strong>plataforma</strong> (gestão de todos os tenants). Não é o painel da sua empresa.
      </p>
      {userEmail ? (
        <p className="mt-3 text-sm text-slate-600">
          Você entrou como <strong>{userEmail}</strong>, que não está na lista{" "}
          <code className="rounded bg-white px-1.5 py-0.5">PLATFORM_ADMIN_EMAILS</code>.
        </p>
      ) : null}
      <p className="mt-3 text-sm text-slate-600">
        Para abrir o painel da clínica/empresa, use{" "}
        <Link href="/app" className="font-semibold text-blue-600">
          /app
        </Link>
        . Para o console admin, entre com um e-mail autorizado ou peça inclusão na allowlist.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700">
          <Link href="/app">Ir para o painel</Link>
        </Button>
        <LogoutButton className="text-sm font-medium text-slate-600" />
      </div>
    </div>
  );
}
