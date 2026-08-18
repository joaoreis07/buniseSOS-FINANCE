"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Brand } from "@/shared/components/brand";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { loginAction } from "../actions/auth.actions";
import { loginSchema, type LoginInput } from "../schemas/auth.schemas";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(values, callbackUrl);
      if (result && !result.success) {
        setError(result.error);
      }
    });
  });

  return (
    <AuthShell
      title="Olá! Bem-vindo de volta"
      subtitle="Digite seu e-mail e senha para abrir o painel."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/criar-conta" className="font-semibold text-blue-600">
            Criar conta grátis
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-sm text-slate-600">
          Use o mesmo e-mail com que você se cadastrou. Se esquecer a senha, clique em{" "}
          <span className="font-semibold">Esqueci minha senha</span>.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="email">Seu e-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ex: maria@email.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Sua senha</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-blue-600">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={pending} className="h-12 rounded-xl bg-blue-600 text-base hover:bg-blue-700">
          {pending ? "Abrindo o painel..." : "Entrar no painel"}
        </Button>
      </form>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Brand />
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>}
      </div>
    </div>
  );
}
