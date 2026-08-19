"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exitDemoToHomeAction } from "@/modules/auth/actions/auth.actions";
import { cn } from "@/shared/components/ui/utils";

export function ExitDemoButton({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await exitDemoToHomeAction();
          if (result && !result.success) {
            router.push("/");
            router.refresh();
          }
        });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60",
        variant === "light"
          ? "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          : "border border-white/15 bg-white/5 text-white hover:bg-white/10",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" />
      {pending ? "Saindo..." : "Voltar ao site"}
    </button>
  );
}
