"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, type PaymentMethod } from "@/modules/finance/types";
import { createSaleAction } from "../actions/crm.actions";
import type { CreateSaleFormInput } from "../schemas/crm.schemas";

type CategoryOption = { id: string; name: string };
type CustomerOption = { id: string; name: string };

export function SaleFormDialog({
  open,
  onOpenChange,
  customers,
  categories,
  defaultCustomerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerOption[];
  categories: CategoryOption[];
  defaultCustomerId?: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateSaleFormInput>({
    defaultValues: {
      customerId: defaultCustomerId ?? "",
      description: "",
      categoryId: "__none__",
      totalAmount: "",
      paymentMethod: "PIX",
      paymentMode: "CASH",
      cashStatus: "PAID",
      installmentsCount: "2",
      firstDueDate: new Date().toISOString().slice(0, 10),
      period: "MONTHLY",
      customPeriodDays: "30",
      notes: "",
    },
  });

  const paymentMode = form.watch("paymentMode");
  const paymentMethod = form.watch("paymentMethod");
  const period = form.watch("period");
  const isCardCredit = paymentMethod === "CARD_CREDIT";

  useEffect(() => {
    if (!open) return;
    form.reset({
      customerId: defaultCustomerId ?? customers[0]?.id ?? "",
      description: "",
      categoryId: "__none__",
      totalAmount: "",
      paymentMethod: "PIX",
      paymentMode: "CASH",
      cashStatus: "PAID",
      installmentsCount: "2",
      firstDueDate: new Date().toISOString().slice(0, 10),
      period: "MONTHLY",
      customPeriodDays: "30",
      notes: "",
    });
  }, [open, defaultCustomerId, customers, form]);

  useEffect(() => {
    if (!isCardCredit) return;
    form.setValue("paymentMode", "CASH");
    form.setValue("cashStatus", "PAID");
    form.setValue("installmentsCount", "");
  }, [isCardCredit, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const payload =
        values.paymentMethod === "CARD_CREDIT"
          ? {
              ...values,
              paymentMode: "CASH" as const,
              cashStatus: "PAID" as const,
            }
          : values;
      const result = await createSaleAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Venda registrada");
      onSaved();
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova venda</DialogTitle>
          <DialogDescription>
            Registre uma venda à vista ou parcelada. Pagamentos atualizam o financeiro automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Cliente *</Label>
            <Select
              value={form.watch("customerId")}
              onValueChange={(value) => form.setValue("customerId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sale-description">Descrição *</Label>
            <Input id="sale-description" {...form.register("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={form.watch("categoryId") ?? "__none__"}
                onValueChange={(value) => form.setValue("categoryId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sale-amount">Valor total *</Label>
              <Input id="sale-amount" placeholder="0,00" {...form.register("totalAmount")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Forma de pagamento</Label>
            <Select
              value={form.watch("paymentMethod")}
              onValueChange={(value: PaymentMethod) => form.setValue("paymentMethod", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCardCredit ? (
            <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
              <p className="text-sm text-slate-700">
                No <span className="font-semibold">cartão de crédito</span>, a venda entra como{" "}
                <span className="font-semibold">paga</span>. O parcelamento é com o banco do cliente —
                não gera parcelas para você cobrar.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="sale-card-installments">Vezes no cartão (opcional)</Label>
                <Input
                  id="sale-card-installments"
                  type="number"
                  min={1}
                  max={48}
                  placeholder="Ex.: 3"
                  {...form.register("installmentsCount")}
                />
                <p className="text-[11px] text-slate-500">
                  Só para anotar (ex.: 3x). Não cria cobrança mensal.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Forma de recebimento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => form.setValue("paymentMode", "CASH")}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      paymentMode === "CASH"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    À vista
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue("paymentMode", "INSTALLMENT")}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      paymentMode === "INSTALLMENT"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    Parcelado
                  </button>
                </div>
              </div>

              {paymentMode === "CASH" ? (
                <div className="grid gap-2">
                  <Label>Status do pagamento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => form.setValue("cashStatus", "PAID")}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        form.watch("cashStatus") === "PAID"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("cashStatus", "PENDING")}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        form.watch("cashStatus") === "PENDING"
                          ? "border-amber-600 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      Pendente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="sale-installments">Quantidade de parcelas</Label>
                      <Input
                        id="sale-installments"
                        type="number"
                        min={2}
                        {...form.register("installmentsCount")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sale-first-due">Primeiro vencimento</Label>
                      <Input id="sale-first-due" type="date" {...form.register("firstDueDate")} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Periodicidade</Label>
                    <Select
                      value={form.watch("period") ?? "MONTHLY"}
                      onValueChange={(value: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM") =>
                        form.setValue("period", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                        <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                        <SelectItem value="WEEKLY">Semanal</SelectItem>
                        <SelectItem value="CUSTOM">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {period === "CUSTOM" && (
                    <div className="grid gap-2">
                      <Label htmlFor="sale-custom-days">Intervalo em dias</Label>
                      <Input
                        id="sale-custom-days"
                        type="number"
                        min={1}
                        {...form.register("customPeriodDays")}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="sale-notes">Observações</Label>
            <Textarea id="sale-notes" rows={2} {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {pending ? "Salvando..." : "Registrar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
