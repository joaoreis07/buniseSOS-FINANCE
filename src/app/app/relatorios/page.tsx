import { BusinessReportsView } from "@/modules/business-reports/components/business-reports-view";
import { getProfessionalReport } from "@/modules/business-reports/services/business-reports.service";
import { listCustomersCrm } from "@/modules/crm/services/crm.service";
import { listFinanceCategories } from "@/modules/finance/services/finance.service";
import { requirePermission } from "@/shared/lib/session";
import { isFeatureEnabled } from "@/shared/services/feature-flags.service";
import { redirect } from "next/navigation";

export default async function RelatoriosPage() {
  const user = await requirePermission("reports:view");
  const enabled = await isFeatureEnabled(user.companyId, "reports");
  if (!enabled) redirect("/app");

  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = now.toISOString().slice(0, 10);

  const [report, customers, incomeCategories, expenseCategories] = await Promise.all([
    getProfessionalReport(user.companyId, { from, to, type: "GENERAL" }),
    listCustomersCrm(user.companyId),
    listFinanceCategories(user.companyId, "INCOME").catch(() => []),
    listFinanceCategories(user.companyId, "EXPENSE").catch(() => []),
  ]);

  const categories = [...incomeCategories, ...expenseCategories].map((item) => ({
    id: item.id,
    name: item.name,
  }));

  return (
    <BusinessReportsView
      initialReport={report}
      customers={customers.map((item) => ({ id: item.id, name: item.name }))}
      categories={categories}
    />
  );
}
