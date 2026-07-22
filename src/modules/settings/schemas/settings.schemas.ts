import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  cnpj: z.string().trim(),
  phone: z.string().trim(),
  address: z.string().trim(),
  city: z.string().trim(),
  state: z.string().trim().max(2, "Use a UF com 2 letras"),
  zipCode: z.string().trim(),
});

export const companySettingsFormSchema = z.object({
  theme: z.enum(["light", "dark"]),
  language: z.string().trim().min(2),
  currency: z.string().trim().min(3).max(3),
  timezone: z.string().trim().min(2),
  dateFormat: z.string().trim().min(2),
  notifications: z.boolean(),
  monthlyGoal: z.string().trim().min(1, "Informe a meta mensal"),
});

export const updateSettingsPayloadSchema = companySettingsFormSchema.transform((data) => {
  const monthlyGoal = Number(data.monthlyGoal.replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(monthlyGoal) || monthlyGoal < 0) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Informe uma meta válida",
        path: ["monthlyGoal"],
      },
    ]);
  }
  return {
    theme: data.theme,
    language: data.language,
    currency: data.currency.toUpperCase(),
    timezone: data.timezone,
    dateFormat: data.dateFormat,
    notifications: data.notifications,
    monthlyGoal,
  };
});

export const notificationIdSchema = z.object({
  id: z.string().min(1),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type CompanySettingsFormInput = z.infer<typeof companySettingsFormSchema>;
