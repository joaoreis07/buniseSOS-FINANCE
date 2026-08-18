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
import type { InstallmentDTO } from "../dto/crm.dto";
import { receiveInstallmentAction } from "../actions/crm.actions";
import type { ReceiveInstallmentFormInput } from "../schemas/crm.schemas";

function formatMoneyInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export function ReceiveInstallmentDialog({
  open,
  onOpenChange,
  installment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: InstallmentDTO | null;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ReceiveInstallmentFormInput>({
    defaultValues: {
      installmentId: "",
      amount: "",
      paidAt: new Date().toISOString().slice(0, 10),
      paymentMethod: "PIX",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open || !installment) return;
    const remaining = installment.amountRemaining > 0
      ? installment.amountRemaining
      : installment.amount;
    form.reset({
      installmentId: installment.id,
      amount: formatMoneyInput(remaining),
      paidAt: new Date().toISOString().slice(0, 10),
      paymentMethod: "PIX",
      notes: "",
    });
  }, [open, installment, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await receiveInstallmentAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Pagamento registrado");
      onSaved();
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receber parcela</DialogTitle>
          <DialogDescription>
            {installment
              ? `${installment.saleDescription} · Parcela ${installment.number}`
              : "Confirme o recebimento da parcela."}
          </DialogDescription>
        </DialogHeader>

        {installment && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <p>
              Valor da parcela:{" "}
              <span className="font-semibold text-slate-900">{installment.formattedAmount}</span>
            </p>
            <p>
              Já pago:{" "}
              <span className="font-semibold text-emerald-700">{installment.formattedAmountPaid}</span>
            </p>
            <p>
              Saldo restante:{" "}
              <span className="font-semibold text-rose-600">
                {installment.formattedAmountRemaining}
              </span>
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="receive-amount">Valor recebido *</Label>
            <Input id="receive-amount" {...form.register("amount")} />
            <p className="text-xs text-slate-400">
              Pode ser parcial. A parcela só fica quitada quando o saldo zerar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="receive-date">Data *</Label>
              <Input id="receive-date" type="date" {...form.register("paidAt")} />
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="receive-notes">Observação</Label>
            <Textarea id="receive-notes" rows={2} {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending || !installment}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {pending ? "Confirmando..." : "Confirmar recebimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
