"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { changePasswordAction } from "../actions/auth.actions";
import { changePasswordSchema, type ChangePasswordInput } from "../schemas/auth.schemas";
import { AuthShell } from "./login-form";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Senha alterada.");
      form.reset();
      router.refresh();
    });
  });

  return (
    <AuthShell
      title="Alterar senha"
      subtitle="Atualize a senha da sua conta."
      footer={
        <Link href="/app" className="font-semibold text-blue-600">
          Voltar ao painel
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="currentPassword">Senha atual</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
          {form.formState.errors.currentPassword && (
            <p className="text-xs text-red-600">
              {form.formState.errors.currentPassword.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("newPassword")}
          />
          {form.formState.errors.newPassword && (
            <p className="text-xs text-red-600">{form.formState.errors.newPassword.message}</p>
          )}
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        )}
        <Button type="submit" disabled={pending} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700">
          {pending ? "Salvando..." : "Alterar senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
