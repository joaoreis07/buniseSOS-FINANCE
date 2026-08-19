import { InsightsView } from "@/modules/insights/components/insights-view";
import { getInsightsOverview } from "@/modules/insights/services/insights.service";
import { requirePermission } from "@/shared/lib/session";

export default async function InsightsPage() {
  const user = await requirePermission("finance:view");
  const data = await getInsightsOverview(user.companyId);
  return <InsightsView data={data} />;
}
