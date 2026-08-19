import { z } from "zod";
import { paymentMethodSchema } from "@/modules/crm/schemas/crm.schemas";

export const listSalesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  period: z.enum(["hoje", "ontem", "semana", "mes", "todos", "personalizado"]).optional(),
  customFrom: z.string().optional(),
  customTo: z.string().optional(),
  status: z.enum(["ALL", "PAID", "PENDING", "PARTIAL", "OVERDUE", "CANCELED"]).optional(),
  paymentMethod: z.union([paymentMethodSchema, z.literal("ALL")]).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});
