"use server";

import { z } from "zod";
import { requirePermission } from "@/shared/lib/session";
import {
  getProfessionalReport,
  reportToCsv,
  type ProfessionalReportDTO,
  type ProfessionalReportType,
} from "../services/business-reports.service";

const filtersSchema = z.object({
  from: z.string().min(8),
  to: z.string().min(8),
  customerId: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.string().optional(),
  type: z.enum([
    "GENERAL",
    "CASHFLOW",
    "INCOME",
    "EXPENSE",
    "INSTALLMENTS",
    "CUSTOMERS",
    "CATEGORIES",
    "MONTHLY",
  ]),
});

export async function getProfessionalReportAction(
  input: unknown,
): Promise<ProfessionalReportDTO> {
  const user = await requirePermission("reports:view");
  const filters = filtersSchema.parse(input);
  return getProfessionalReport(user.companyId, {
    ...filters,
    type: filters.type as ProfessionalReportType,
  });
}

export async function exportProfessionalReportCsvAction(
  input: unknown,
): Promise<{ filename: string; csv: string }> {
  const user = await requirePermission("reports:view");
  const filters = filtersSchema.parse(input);
  const report = await getProfessionalReport(user.companyId, {
    ...filters,
    type: filters.type as ProfessionalReportType,
  });
  return {
    filename: `${report.title.toLowerCase().replace(/\s+/g, "-")}.csv`,
    csv: reportToCsv(report.rows),
  };
}
