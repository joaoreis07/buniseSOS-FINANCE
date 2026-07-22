import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";

export function ComingSoonPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <EmptyState
        title="Em breve"
        description="Este módulo está preparado na arquitetura e será liberado nas próximas etapas."
        icon={icon}
      />
    </div>
  );
}
