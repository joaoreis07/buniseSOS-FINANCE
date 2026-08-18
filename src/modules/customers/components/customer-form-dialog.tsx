"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import type { CustomerClientDTO } from "../dto/customer.dto";
import {
  createCustomerAction,
  updateCustomerAction,
} from "../actions/customer.actions";
import {
  customerFormSchema,
  type CustomerFormInput,
} from "../schemas/customer.schemas";

const emptyValues: CustomerFormInput = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  document: "",
  address: "",
  city: "",
  state: "",
  notes: "",
  status: "ACTIVE",
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerClientDTO | null;
  onSaved: (customer: CustomerClientDTO) => void;
}) {
  const isEdit = Boolean(customer);
  const [pending, startTransition] = useTransition();

  const form = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    if (customer) {
      form.reset({
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        whatsapp: customer.whatsapp ?? "",
        document: customer.document ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        state: customer.state ?? "",
        notes: customer.notes ?? "",
        status: customer.status,
      });
    } else {
      form.reset(emptyValues);
    }
  }, [open, customer, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = isEdit && customer
        ? await updateCustomerAction({ id: customer.id, ...values })
        : await createCustomerAction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? (isEdit ? "Cliente atualizado" : "Cliente criado"));
      onSaved(result.data);
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados cadastrais do cliente."
              : "Cadastre um novo cliente na sua base."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Nome *</Label>
            <Input id="customer-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="customer-email">E-mail</Label>
              <Input id="customer-email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-phone">Telefone</Label>
              <Input id="customer-phone" {...form.register("phone")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="customer-whatsapp">WhatsApp</Label>
              <Input id="customer-whatsapp" {...form.register("whatsapp")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-document">CPF/CNPJ</Label>
              <Input id="customer-document" {...form.register("document")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status") ?? "ACTIVE"}
              onValueChange={(value: "ACTIVE" | "INACTIVE" | "BLOCKED") => {
                form.setValue("status", value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
                <SelectItem value="BLOCKED">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customer-address">Endereço</Label>
            <Input id="customer-address" {...form.register("address")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="customer-city">Cidade</Label>
              <Input id="customer-city" {...form.register("city")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-state">UF</Label>
              <Input id="customer-state" maxLength={2} {...form.register("state")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customer-notes">Observações</Label>
            <Textarea id="customer-notes" rows={3} {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
