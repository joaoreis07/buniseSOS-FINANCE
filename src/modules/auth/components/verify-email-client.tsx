"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { verifyEmailAction } from "../actions/auth.actions";
import { AuthShell } from "./login-form";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      setError("Token de verificação ausente.");
      return;
    }
    startTransition(async () => {
      const result = await verifyEmailAction({ token });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "E-mail verificado.");
    });
  }, [token]);

  return (
    <AuthShell
      title="Verificação de e-mail"
      subtitle="Estamos confirmando seu endereço de e-mail."
      footer={
        <Link href="/login" className="font-semibold text-blue-600">
          Ir para o login
        </Link>
      }
    >
      <div className="grid gap-4">
        {pending && <p className="text-sm text-slate-500">Verificando...</p>}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        )}
        <Button asChild className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700">
          <Link href="/app">Abrir painel</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
