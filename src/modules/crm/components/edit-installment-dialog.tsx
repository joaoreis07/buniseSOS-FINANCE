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
import { Textarea } from "@/shared/components/ui/textarea";
import { updateInstallmentAction } from "../actions/crm.actions";
import type { InstallmentDTO } from "../dto/crm.dto";
import type { UpdateInstallmentFormInput } from "../schemas/crm.schemas";

export function EditInstallmentDialog({
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
  const form = useForm<UpdateInstallmentFormInput>({
    defaultValues: {
      id: "",
      amount: "",
      dueDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open || !installment) return;
    form.reset({
      id: installment.id,
      amount: String(installment.amount).replace(".", ","),
      dueDate: installment.dueDate.slice(0, 10),
      notes: installment.notes ?? "",
    });
  }, [open, installment, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateInstallmentAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Parcela atualizada");
      onSaved();
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar parcela</DialogTitle>
          <DialogDescription>
            {installment
              ? `Parcela #${installment.number} · ${installment.saleDescription}`
              : "Corrija valor ou vencimento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-inst-amount">Valor *</Label>
              <Input id="edit-inst-amount" {...form.register("amount")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-inst-due">Vencimento *</Label>
              <Input id="edit-inst-due" type="date" {...form.register("dueDate")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-inst-notes">Observações</Label>
            <Textarea id="edit-inst-notes" rows={2} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="rounded-xl bg-blue-600 hover:bg-blue-700">
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
