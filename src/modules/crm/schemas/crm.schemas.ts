import { z } from "zod";

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

export const createSaleSchema = z
  .object({
    customerId: z.string().min(1, "Selecione o cliente"),
    description: z.string().trim().min(2, "Informe a descrição"),
    categoryId: z.string().optional(),
    totalAmount: z.string().trim().min(1, "Informe o valor"),
    paymentMethod: paymentMethodSchema,
    paymentMode: z.enum(["CASH", "INSTALLMENT"]),
    cashStatus: z.enum(["PAID", "PENDING"]).optional(),
    installmentsCount: z.string().optional(),
    firstDueDate: z.string().optional(),
    period: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]).optional(),
    customPeriodDays: z.string().optional(),
    notes: z.string().optional(),
  })
  .transform((data, ctx) => {
    const normalized = data.totalAmount.trim().replace(/[^\d.,-]/g, "");
    const totalAmount = Number(
      normalized.includes(",")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized,
    );
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido", path: ["totalAmount"] });
      return z.NEVER;
    }

    if (data.paymentMode === "CASH" && !data.cashStatus && data.paymentMethod !== "CARD_CREDIT") {
      ctx.addIssue({ code: "custom", message: "Informe se está pago ou pendente", path: ["cashStatus"] });
      return z.NEVER;
    }

    const rawInstallments = Number(data.installmentsCount ?? "");
    const installmentsCount =
      data.paymentMethod === "CARD_CREDIT"
        ? Number.isFinite(rawInstallments) && rawInstallments >= 1
          ? Math.floor(rawInstallments)
          : 1
        : data.paymentMode === "INSTALLMENT"
          ? Number(data.installmentsCount ?? "1")
          : 1;
    if (data.paymentMode === "INSTALLMENT" && data.paymentMethod !== "CARD_CREDIT" && (!Number.isInteger(installmentsCount) || installmentsCount < 2)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe ao menos 2 parcelas",
        path: ["installmentsCount"],
      });
      return z.NEVER;
    }

    if (data.paymentMode === "INSTALLMENT" && data.paymentMethod !== "CARD_CREDIT" && !data.firstDueDate) {
      ctx.addIssue({ code: "custom", message: "Informe o primeiro vencimento", path: ["firstDueDate"] });
      return z.NEVER;
    }

    return {
      customerId: data.customerId,
      description: data.description,
      categoryId: data.categoryId && data.categoryId !== "__none__" ? data.categoryId : null,
      totalAmount,
      paymentMethod: data.paymentMethod,
      paymentMode: data.paymentMethod === "CARD_CREDIT" ? ("CASH" as const) : data.paymentMode,
      cashStatus: data.paymentMethod === "CARD_CREDIT" ? ("PAID" as const) : data.cashStatus,
      installmentsCount,
      firstDueDate: data.firstDueDate,
      period: data.period ?? "MONTHLY",
      customPeriodDays: data.customPeriodDays ? Number(data.customPeriodDays) : undefined,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    };
  });

export const receiveInstallmentSchema = z
  .object({
    installmentId: z.string().min(1),
    amount: z.string().trim().min(1, "Informe o valor"),
    paidAt: z.string().min(1, "Informe a data"),
    paymentMethod: paymentMethodSchema,
    notes: z.string().optional(),
  })
  .transform((data, ctx) => {
    const normalized = data.amount.trim().replace(/[^\d.,-]/g, "");
    const amount = Number(
      normalized.includes(",")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized,
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido", path: ["amount"] });
      return z.NEVER;
    }
    return {
      installmentId: data.installmentId,
      amount,
      paidAt: data.paidAt,
      paymentMethod: data.paymentMethod,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    };
  });

export type CreateSaleFormInput = z.input<typeof createSaleSchema>;
export type ReceiveInstallmentFormInput = z.input<typeof receiveInstallmentSchema>;

function parseMoney(value: string, ctx: z.RefinementCtx, path: string): number | typeof z.NEVER {
  const normalized = value.trim().replace(/[^\d.,-]/g, "");
  const amount = Number(
    normalized.includes(",")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized,
  );
  if (!Number.isFinite(amount) || amount <= 0) {
    ctx.addIssue({ code: "custom", message: "Valor inválido", path: [path] });
    return z.NEVER;
  }
  return amount;
}

export const updateSaleSchema = z
  .object({
    id: z.string().min(1, "Venda inválida"),
    description: z.string().trim().min(2, "Informe a descrição"),
    categoryId: z.string().optional(),
    totalAmount: z.string().trim().min(1, "Informe o valor"),
    paymentMethod: paymentMethodSchema,
    soldAt: z.string().min(1, "Informe a data"),
    notes: z.string().optional(),
  })
  .transform((data, ctx) => {
    const totalAmount = parseMoney(data.totalAmount, ctx, "totalAmount");
    if (totalAmount === z.NEVER) return z.NEVER;
    return {
      id: data.id,
      description: data.description,
      categoryId: data.categoryId && data.categoryId !== "__none__" ? data.categoryId : null,
      totalAmount,
      paymentMethod: data.paymentMethod,
      soldAt: data.soldAt,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    };
  });

export const updateInstallmentSchema = z
  .object({
    id: z.string().min(1, "Parcela inválida"),
    amount: z.string().trim().min(1, "Informe o valor"),
    dueDate: z.string().min(1, "Informe o vencimento"),
    notes: z.string().optional(),
  })
  .transform((data, ctx) => {
    const amount = parseMoney(data.amount, ctx, "amount");
    if (amount === z.NEVER) return z.NEVER;
    return {
      id: data.id,
      amount,
      dueDate: data.dueDate,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    };
  });

export const saleIdSchema = z.object({
  id: z.string().min(1, "Venda inválida"),
});

export type UpdateSaleFormInput = z.input<typeof updateSaleSchema>;
export type UpdateInstallmentFormInput = z.input<typeof updateInstallmentSchema>;
