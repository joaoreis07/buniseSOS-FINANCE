import { z } from "zod";

export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]);

/** Form-friendly schema (empty strings allowed); normalize before persistence. */
export const customerFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente"),
  email: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: "Informe um e-mail válido",
    }),
  phone: z.string().trim(),
  document: z.string().trim(),
  address: z.string().trim(),
  city: z.string().trim(),
  state: z.string().trim().max(2, "Use a UF com 2 letras"),
  notes: z.string().trim(),
  status: customerStatusSchema,
});

export const createCustomerSchema = customerFormSchema.transform((data) => ({
  name: data.name,
  email: data.email.length > 0 ? data.email : null,
  phone: data.phone.length > 0 ? data.phone : null,
  document: data.document.length > 0 ? data.document : null,
  address: data.address.length > 0 ? data.address : null,
  city: data.city.length > 0 ? data.city : null,
  state: data.state.length > 0 ? data.state.toUpperCase() : null,
  notes: data.notes.length > 0 ? data.notes : null,
  status: data.status,
}));

export const updateCustomerSchema = customerFormSchema.partial().extend({
  name: z.string().trim().min(2, "Informe o nome do cliente").optional(),
}).transform((data) => {
  const out: Record<string, unknown> = {};
  if (data.name !== undefined) out.name = data.name;
  if (data.email !== undefined) out.email = data.email.length > 0 ? data.email : null;
  if (data.phone !== undefined) out.phone = data.phone.length > 0 ? data.phone : null;
  if (data.document !== undefined) {
    out.document = data.document.length > 0 ? data.document : null;
  }
  if (data.address !== undefined) {
    out.address = data.address.length > 0 ? data.address : null;
  }
  if (data.city !== undefined) out.city = data.city.length > 0 ? data.city : null;
  if (data.state !== undefined) {
    out.state = data.state.length > 0 ? data.state.toUpperCase() : null;
  }
  if (data.notes !== undefined) out.notes = data.notes.length > 0 ? data.notes : null;
  if (data.status !== undefined) out.status = data.status;
  return out;
});

export const customerIdSchema = z.object({
  id: z.string().min(1, "Cliente inválido"),
});

export const updateCustomerWithIdSchema = z
  .object({ id: z.string().min(1, "Cliente inválido") })
  .and(customerFormSchema.partial().extend({
    name: z.string().trim().min(2, "Informe o nome do cliente").optional(),
  }))
  .transform(({ id, ...data }) => {
    const normalized = updateCustomerSchema.parse(data);
    return { id, ...normalized };
  });

export const customerListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: customerStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CustomerFormInput = z.infer<typeof customerFormSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerListQueryInput = z.infer<typeof customerListQuerySchema>;
