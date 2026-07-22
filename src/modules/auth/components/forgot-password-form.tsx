"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { forgotPasswordAction } from "../actions/auth.actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas/auth.schemas";
import { AuthShell } from "./login-form";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "E-mail enviado.");
    });
  });

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Enviaremos um link para redefinir sua senha."
      footer={
        <Link href="/login" className="font-semibold text-blue-600">
          Voltar ao login
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        )}
        <Button type="submit" disabled={pending} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700">
          {pending ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
    </AuthShell>
  );
}
