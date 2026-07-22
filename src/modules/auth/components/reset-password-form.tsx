"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { resetPasswordAction } from "../actions/auth.actions";
import { resetPasswordSchema } from "../schemas/auth.schemas";
import { AuthShell } from "./login-form";

const formSchema = resetPasswordSchema.omit({ token: true });
type FormInput = z.infer<typeof formSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordAction({ token, password: values.password });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/login");
    });
  });

  return (
    <AuthShell
      title="Redefinir senha"
      subtitle="Digite sua nova senha de acesso."
      footer={
        <Link href="/login" className="font-semibold text-blue-600">
          Voltar ao login
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button
          type="submit"
          disabled={pending || !token}
          className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700"
        >
          {pending ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
