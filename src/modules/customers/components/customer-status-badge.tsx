import { cn } from "@/shared/components/ui/utils";

const STATUS_LABEL: Record<"ACTIVE" | "INACTIVE" | "BLOCKED", string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
};

export function CustomerStatusBadge({
  status,
}: {
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "ACTIVE" && "bg-emerald-50 text-emerald-700",
        status === "INACTIVE" && "bg-slate-100 text-slate-600",
        status === "BLOCKED" && "bg-rose-50 text-rose-700",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
