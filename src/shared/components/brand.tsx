import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type BrandProps = {
  light?: boolean;
  /** Só o monograma, sem texto */
  logoOnly?: boolean;
  className?: string;
};

export function Brand({ light = false, logoOnly = false, className = "" }: BrandProps) {
  return (
    <div
      className={`flex items-center gap-2.5 font-semibold tracking-[-0.04em] ${
        light ? "text-white" : "text-slate-950"
      } ${className}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-tight shadow-lg shadow-blue-600/25 ${
          light ? "bg-white text-blue-700" : "bg-blue-600 text-white"
        }`}
        aria-hidden
      >
        B
      </span>
      {!logoOnly && (
        <span className="min-w-0 leading-tight">
          <span className="block text-[15px] tracking-[-0.03em]">BusinessOS</span>
          <span
            className={`block text-[10px] font-medium uppercase tracking-[0.14em] ${
              light ? "text-white/55" : "text-slate-400"
            }`}
          >
            Finance
          </span>
        </span>
      )}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-700">
      <Sparkles className="size-3" />
      {children}
    </span>
  );
}
