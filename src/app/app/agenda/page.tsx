import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { ComingSoonPage } from "@/shared/components/coming-soon-page";
import { requirePermission } from "@/shared/lib/session";
import { isFeatureEnabled } from "@/shared/services/feature-flags.service";

export default async function AgendaPage() {
  const user = await requirePermission("agenda:view");
  const enabled = await isFeatureEnabled(user.companyId, "agenda");
  if (!enabled) {
    redirect("/app");
  }

  return (
    <ComingSoonPage
      title="Agenda"
      description="Agendamentos e rotina da clínica."
      icon={CalendarDays}
    />
  );
}
