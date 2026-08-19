import { getCalendarOverview } from "@/modules/calendar/services/calendar.service";
import { FinancialCalendarView } from "@/modules/calendar/components/financial-calendar-view";
import { requirePermission } from "@/shared/lib/session";

export default async function CalendarPage() {
  const user = await requirePermission("finance:view");
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const data = await getCalendarOverview(user.companyId, monthKey);
  return <FinancialCalendarView initialData={data} initialMonthKey={monthKey} />;
}
