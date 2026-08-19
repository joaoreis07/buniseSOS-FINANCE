import { z } from "zod";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
export const transactionStatusSchema = z.enum(["PENDING", "PAID", "OVERDUE", "CANCELED"]);
export const paymentMethodSchema = z.enum([
  "PIX",
  "CASH",
  "CARD",
  "CARD_CREDIT",
  "CARD_DEBIT",
  "TED",
  "BOLETO",
  "OTHER",
]);
export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const transactionFormSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  status: transactionStatusSchema,
  paymentMethod: paymentMethodSchema,
  amount: z.string().trim().min(1, "Informe o valor"),
  description: z.string().trim().min(2, "Informe a descrição"),
  notes: z.string().trim(),
  date: z.string().min(1, "Informe a data"),
  categoryId: z.string().trim(),
  customerId: z.string().trim(),
});

export const createTransactionSchema = transactionFormSchema.transform((data) => {
  const amount = Number(data.amount.replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Informe um valor válido",
        path: ["amount"],
      },
    ]);
  }

  const date = new Date(`${data.date}T12:00:00`);
  const status = data.status;
  return {
    type: data.type as "INCOME" | "EXPENSE",
    status,
    paymentMethod: data.paymentMethod,
    amount,
    description: data.description,
    notes: data.notes.length > 0 ? data.notes : null,
    date,
    dueDate: status === "PENDING" || status === "OVERDUE" ? date : null,
    paidAt: status === "PAID" ? date : null,
    categoryId: data.categoryId.length > 0 ? data.categoryId : null,
    customerId: data.customerId.length > 0 ? data.customerId : null,
  };
});

export const updateTransactionWithIdSchema = z
  .object({ id: z.string().min(1) })
  .and(transactionFormSchema.partial())
  .transform(({ id, ...data }) => {
    const patch: Record<string, unknown> = { id };

    if (data.type !== undefined) patch.type = data.type;
    if (data.status !== undefined) {
      patch.status = data.status;
      const dateValue = data.date ? new Date(`${data.date}T12:00:00`) : undefined;
      if (data.status === "PAID") {
        patch.paidAt = dateValue ?? new Date();
      }
      if (data.status === "PENDING" || data.status === "OVERDUE") {
        patch.dueDate = dateValue ?? new Date();
      }
    }
    if (data.paymentMethod !== undefined) {
      patch.paymentMethod = data.paymentMethod || null;
    }
    if (data.amount !== undefined) {
      const amount = Number(data.amount.replace(",", ".").replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new z.ZodError([
          {
            code: "custom",
            message: "Informe um valor válido",
            path: ["amount"],
          },
        ]);
      }
      patch.amount = amount;
    }
    if (data.description !== undefined) patch.description = data.description;
    if (data.notes !== undefined) {
      patch.notes = data.notes.length > 0 ? data.notes : null;
    }
    if (data.date !== undefined) patch.date = new Date(`${data.date}T12:00:00`);
    if (data.categoryId !== undefined) {
      patch.categoryId = data.categoryId.length > 0 ? data.categoryId : null;
    }
    if (data.customerId !== undefined) {
      patch.customerId = data.customerId.length > 0 ? data.customerId : null;
    }

    return patch as {
      id: string;
      type?: "INCOME" | "EXPENSE";
      status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
      paymentMethod?: "PIX" | "CASH" | "CARD" | "CARD_CREDIT" | "CARD_DEBIT" | "TED" | "BOLETO" | "OTHER" | null;
      amount?: number;
      description?: string;
      notes?: string | null;
      date?: Date;
      dueDate?: Date | null;
      paidAt?: Date | null;
      categoryId?: string | null;
      customerId?: string | null;
    };
  });

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria"),
  type: categoryTypeSchema,
});

export const transactionIdSchema = z.object({
  id: z.string().min(1, "Movimentação inválida"),
});

export const categoryIdSchema = z.object({
  id: z.string().min(1, "Categoria inválida"),
});

export const financeListQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    type: transactionTypeSchema.optional(),
    status: transactionStatusSchema.optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
    dateFrom: z.string().trim().optional(),
    dateTo: z.string().trim().optional(),
  })
  .transform((data) => ({
    search: data.search,
    type: data.type,
    status: data.status,
    page: data.page,
    pageSize: data.pageSize,
    dateFrom: data.dateFrom
      ? new Date(`${data.dateFrom.slice(0, 10)}T00:00:00`)
      : undefined,
    dateTo: data.dateTo
      ? new Date(`${data.dateTo.slice(0, 10)}T23:59:59.999`)
      : undefined,
  }));

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
