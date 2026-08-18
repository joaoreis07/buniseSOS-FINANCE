"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { exitDemoToRegisterAction } from "@/modules/auth/actions/auth.actions";

export function SignupCtaBalloon({
  variant = "inline",
  className = "",
}: {
  /** inline = attached to landing mockup; floating = fixed in demo app */
  variant?: "inline" | "floating";
  className?: string;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  const goToRegister = () => {
    if (variant === "floating") {
      startTransition(async () => {
        const result = await exitDemoToRegisterAction();
        // Successful sign-out redirects; only handle soft failures.
        if (result && !result.success) {
          router.push("/criar-conta");
        }
      });
      return;
    }
    router.push("/criar-conta");
  };

  const ctaClassName =
    "mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60";

  const card = (
    <div
      className={`relative rounded-2xl border-2 border-blue-500 bg-white p-4 shadow-[0_18px_40px_-12px_rgba(8,62,170,0.45)] ${className}`}
    >
      {variant === "floating" && (
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => setHidden(true)}
          className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      )}
      {variant === "inline" && (
        <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-l border-t border-blue-500 bg-white" />
      )}
      <p className="pr-6 text-sm font-semibold leading-snug text-slate-900">
        Crie sua conta grátis e tire o financeiro do papel hoje.
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        Cadastre o primeiro cliente, lance a primeira entrada e veja o saldo na hora.
      </p>
      {variant === "floating" ? (
        <button type="button" onClick={goToRegister} disabled={pending} className={ctaClassName}>
          {pending ? "Saindo da demo..." : "Criar conta grátis"}
          <ArrowRight className="size-4" />
        </button>
      ) : (
        <Link href="/criar-conta" className={ctaClassName}>
          Criar conta grátis
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );

  if (variant === "floating") {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] w-[min(100%-2rem,320px)] sm:bottom-6 sm:right-6">
        <div className="pointer-events-auto">{card}</div>
      </div>
    );
  }

  return card;
}
