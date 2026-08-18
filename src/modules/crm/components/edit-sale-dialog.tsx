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
import { cancelSaleAction, updateSaleAction } from "../actions/crm.actions";
import type { SaleDTO } from "../dto/crm.dto";
import type { UpdateSaleFormInput } from "../schemas/crm.schemas";

type CategoryOption = { id: string; name: string };

export function EditSaleDialog({
  open,
  onOpenChange,
  sale,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleDTO | null;
  categories: CategoryOption[];
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<UpdateSaleFormInput>({
    defaultValues: {
      id: "",
      description: "",
      categoryId: "__none__",
      totalAmount: "",
      paymentMethod: "PIX",
      soldAt: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open || !sale) return;
    form.reset({
      id: sale.id,
      description: sale.description,
      categoryId: sale.categoryId ?? "__none__",
      totalAmount: String(sale.totalAmount).replace(".", ","),
      paymentMethod: sale.paymentMethod as PaymentMethod,
      soldAt: sale.soldAt.slice(0, 10),
      notes: sale.notes ?? "",
    });
  }, [open, sale, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateSaleAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Compra atualizada");
      onSaved();
      onOpenChange(false);
    });
  });

  const onCancel = () => {
    if (!sale) return;
    if (!window.confirm("Remover esta compra? Só funciona se ainda não houver pagamento.")) return;
    startTransition(async () => {
      const result = await cancelSaleAction({ id: sale.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Compra removida");
      onSaved();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
          <DialogDescription>
            Corrija descrição, valor ou data. Se já houve pagamento, o valor não pode mudar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-sale-description">Descrição *</Label>
            <Input id="edit-sale-description" {...form.register("description")} />
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
              <Label htmlFor="edit-sale-amount">Valor total *</Label>
              <Input
                id="edit-sale-amount"
                {...form.register("totalAmount")}
                disabled={sale?.paymentMode === "INSTALLMENT"}
              />
              {sale?.paymentMode === "INSTALLMENT" ? (
                <p className="text-[11px] text-slate-500">
                  Em vendas parceladas, altere o valor pela parcela.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-2">
              <Label htmlFor="edit-sale-date">Data da compra *</Label>
              <Input id="edit-sale-date" type="date" {...form.register("soldAt")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-sale-notes">Observações</Label>
            <Textarea id="edit-sale-notes" rows={2} {...form.register("notes")} />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={onCancel}
              disabled={pending}
            >
              Remover compra
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
