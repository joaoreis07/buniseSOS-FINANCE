import { cn } from "@/shared/components/ui/utils";
import type { PaymentMethod } from "../types";
import { PAYMENT_METHOD_LABELS } from "../types";
import { paymentBadgeClass } from "../utils";

export function PaymentBadge({ method }: { method: PaymentMethod | null }) {
  if (!method) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        paymentBadgeClass(method),
      )}
    >
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}
