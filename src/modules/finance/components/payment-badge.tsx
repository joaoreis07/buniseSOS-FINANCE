import { cn } from "@/shared/components/ui/utils";
import type { PaymentMethod } from "../types";
import { paymentBadgeClass } from "../utils";

export function PaymentBadge({ method }: { method: PaymentMethod }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        paymentBadgeClass(method),
      )}
    >
      {method}
    </span>
  );
}
