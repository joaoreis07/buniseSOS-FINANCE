import { cn } from "@/shared/components/ui/utils";
import type { FinancialCustomerStatus } from "../dto/crm.dto";

const STATUS_META: Record<
  FinancialCustomerStatus,
  { label: string; className: string }
> = {
  UP_TO_DATE: {
    label: "Em dia",
    className: "bg-emerald-50 text-emerald-700",
  },
  HAS_PENDING: {
    label: "Possui parcelas pendentes",
    className: "bg-amber-50 text-amber-700",
  },
  OVERDUE: {
    label: "Inadimplente",
    className: "bg-rose-50 text-rose-700",
  },
};

export function FinancialStatusBadge({
  status,
}: {
  status: FinancialCustomerStatus;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function InstallmentStatusBadge({
  status,
  isPartial = false,
}: {
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  isPartial?: boolean;
}) {
  const showPartial = isPartial && status !== "PAID";
  const map = {
    PAID: { label: "Pago", className: "bg-emerald-50 text-emerald-700" },
    PENDING: { label: "Pendente", className: "bg-amber-50 text-amber-700" },
    OVERDUE: { label: "Vencido", className: "bg-rose-50 text-rose-700" },
    CANCELED: { label: "Cancelado", className: "bg-slate-100 text-slate-600" },
  } as const;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {showPartial ? (
        <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
          Parcial
        </span>
      ) : null}
      {status === "OVERDUE" || !showPartial ? (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
            map[status].className,
          )}
        >
          {map[status].label}
        </span>
      ) : null}
    </span>
  );
}
