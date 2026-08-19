"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDateBR, formatCurrency, toDateInputValue } from "@/modules/finance/utils";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, type PaymentMethod } from "@/modules/finance/types";
import { PaymentBadge } from "@/modules/finance/components/payment-badge";
import { InstallmentStatusBadge, SaleStatusBadge } from "@/modules/crm/components/financial-status-badge";
import { ReceiveInstallmentDialog } from "@/modules/crm/components/receive-installment-dialog";
import type { CategoryClientDTO } from "@/modules/finance/dto/finance.dto";
import type { InstallmentPaymentHistoryDTO, InstallmentDTO, SaleDetailDTO } from "@/modules/crm/dto/crm.dto";
import { cancelSaleAction, updateSaleAction } from "@/modules/crm/actions/crm.actions";
import type { UpdateSaleFormInput } from "@/modules/crm/schemas/crm.schemas";
import { useForm } from "react-hook-form";

function moneyInputFromNumber(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatQuantity(value: number): string {
  // Quantity is stored as Decimal(14,3) - avoid trailing zeros noise.
  const str = String(value);
  if (!str.includes(".")) return str;
  return str.replace(/\.?0+$/, "");
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function EditSaleDialog({
  open,
  onOpenChange,
  sale,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleDetailDTO["sale"];
  categories: CategoryClientDTO[];
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
    if (!open) return;
    form.reset({
      id: sale.id,
      description: sale.description,
      categoryId: sale.categoryId ?? "__none__",
      totalAmount: moneyInputFromNumber(sale.totalAmount),
      paymentMethod: sale.paymentMethod as PaymentMethod,
      soldAt: toDateInputValue(sale.soldAt),
      notes: sale.notes ?? "",
    });
  }, [open, sale, form]);

  const paymentMode = sale.paymentMode;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateSaleAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Venda atualizada");
      onSaved();
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar venda</DialogTitle>
          <DialogDescription>
            Corrija descrição, valor/data e forma de pagamento. Se houver pagamento, a venda não pode ser
            alterada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sale-edit-description">Descrição *</Label>
            <Input id="sale-edit-description" {...form.register("description")} />
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
              <Label htmlFor="sale-edit-amount">Valor total *</Label>
              <Input
                id="sale-edit-amount"
                placeholder="0,00"
                {...form.register("totalAmount")}
                disabled={pending || paymentMode === "INSTALLMENT"}
              />
              {paymentMode === "INSTALLMENT" ? (
                <p className="text-[11px] text-slate-500">Em parcelado, altere o valor pela parcela.</p>
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
              <Label htmlFor="sale-edit-date">Data da venda *</Label>
              <Input id="sale-edit-date" type="date" {...form.register("soldAt")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sale-edit-notes">Observações</Label>
            <Textarea id="sale-edit-notes" rows={2} {...form.register("notes")} />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
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

export function SaleDetailView({
  sale,
  customer,
  items,
  financial,
  installments,
  payments,
  canManage,
  canReceive,
  categories,
}: SaleDetailDTO & {
  canManage: boolean;
  canReceive: boolean;
  categories: CategoryClientDTO[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveInstallment, setReceiveInstallment] = useState<InstallmentDTO | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pendingCancel, startCancelTransition] = useTransition();

  const isCanceled = sale.status === "CANCELED";

  const hasReceivedPayment = useMemo(() => {
    return installments.some((i) => i.status === "PAID" || i.amountPaid > 0);
  }, [installments]);

  const hasSaleItems = items.length > 0;

  const canEdit = canManage && !isCanceled && !hasReceivedPayment && !hasSaleItems;
  const canCancel = canManage && !isCanceled;

  const openInstallment = useMemo(() => {
    return (
      installments.find((i) => i.status !== "CANCELED" && i.amountRemaining > 0) ??
      null
    );
  }, [installments]);

  const canReceiveNow = canReceive && !isCanceled && Boolean(openInstallment);

  useEffect(() => {
    if (!receiveOpen) return;
    setReceiveInstallment(openInstallment);
  }, [receiveOpen, openInstallment]);

  const onOpenReceive = () => {
    if (!openInstallment) return;
    setReceiveInstallment(openInstallment);
    setReceiveOpen(true);
  };

  const paymentsByInstallmentId = useMemo(() => {
    const map = new Map<string, InstallmentPaymentHistoryDTO[]>();
    for (const payment of payments) {
      const list = map.get(payment.installmentId) ?? [];
      list.push(payment);
      map.set(payment.installmentId, list);
    }
    for (const [id, list] of map.entries()) {
      list.sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
      map.set(id, list);
    }
    return map;
  }, [payments]);

  const onEditSaved = () => {
    router.refresh();
  };

  const onCancelConfirmed = () => {
    if (!canManage || !sale.id) return;
    startCancelTransition(async () => {
      const result = await cancelSaleAction({ id: sale.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Venda cancelada");
      setCancelOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="grid min-w-0 max-w-full gap-5 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            Venda #{sale.code} · {formatDateBR(sale.soldAt)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <SaleStatusBadge status={sale.status} />
            <div className="min-w-0">
              {customer?.id ? (
                <Link
                  href={`/app/customers/${customer.id}`}
                  className="truncate text-lg font-semibold tracking-[-0.03em] text-slate-900 hover:text-blue-700"
                >
                  {customer.name}
                </Link>
              ) : (
                <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">{customer.name}</p>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">{sale.description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link href="/app/sales">Voltar para Vendas</Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            disabled={!canEdit}
            title={
              canEdit
                ? "Editar venda"
                : isCanceled
                  ? "Venda cancelada"
                  : hasReceivedPayment
                    ? "Não é possível editar uma venda com pagamento"
                    : hasSaleItems
                      ? "Edição não disponível para vendas com itens"
                      : "Você não tem permissão"
            }
            onClick={() => setEditOpen(true)}
          >
            Editar
          </Button>

          <Button
            type="button"
            variant="destructive"
            className="h-11 rounded-xl"
            disabled={!canCancel}
            onClick={() => setCancelOpen(true)}
            title={canCancel ? "Cancelar venda" : "Você não pode cancelar esta venda"}
          >
            Cancelar
          </Button>

          {canReceiveNow ? (
            <Button type="button" className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={onOpenReceive}>
              Receber
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Itens</h3>
              <p className="mt-2 text-slate-600">{sale.description}</p>
            </div>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(financial.total)}</p>
          </div>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Itens da venda</h3>
            <p className="text-xs text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}</p>
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Qtde</th>
                  <th className="px-4 py-3 font-medium">Unitário</th>
                  <th className="px-4 py-3 font-medium">Desconto</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5 text-slate-700">
                      <p className="font-medium">{item.description}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatQuantity(item.quantity)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                      {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{item.description}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatQuantity(item.quantity)} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                </div>
                {item.discountAmount > 0 ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Desconto: <span className="font-medium">{formatCurrency(item.discountAmount)}</span>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Resumo financeiro</h3>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-900">{formatCurrency(financial.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Desconto por itens</span>
              <span className="font-semibold text-slate-900">
                {financial.itemDiscountTotal > 0 ? formatCurrency(financial.itemDiscountTotal) : <span className="text-slate-400">—</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Desconto geral</span>
              <span className="font-semibold text-slate-900">{formatCurrency(financial.generalDiscount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <span className="text-slate-600">Total da venda</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(financial.total)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Pagamento</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Forma de pagamento</span>
              <PaymentBadge method={sale.paymentMethod as PaymentMethod} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Condição</span>
              <span className="font-semibold text-slate-900">
                {sale.paymentMode === "CASH"
                  ? "À vista"
                  : `Parcelado ${sale.installmentsCount}x`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Situação atual</span>
              <SaleStatusBadge status={sale.status} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Parcelas</h3>
          <p className="text-xs text-slate-500">{installments.length} parcela{installments.length === 1 ? "" : "s"}</p>
        </div>

        {installments.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Sem parcelas" subtitle="Esta venda não possui parcelas cadastradas." />
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Parcela</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Vencimento</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 font-medium">Restante</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Pagamento(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((inst) => {
                    const list = paymentsByInstallmentId.get(inst.id) ?? [];
                    const paidDates = list.length > 0 ? list.map((p) => formatDateBR(p.paidAt)) : inst.paidAt ? [formatDateBR(inst.paidAt)] : [];
                    return (
                      <tr key={inst.id} className="border-t border-slate-100">
                        <td className="px-4 py-3.5 text-slate-700">
                          <p className="font-medium">
                            Parcela {inst.number}/{sale.installmentsCount}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{inst.formattedAmount}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatDateBR(inst.dueDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{inst.formattedAmountPaid}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{inst.formattedAmountRemaining}</td>
                        <td className="px-4 py-3.5">
                          <InstallmentStatusBadge status={inst.status} isPartial={inst.isPartial} />
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {paidDates.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {paidDates.map((d, idx) => (
                                <span key={`${d}-${idx}`}>{d}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {installments.map((inst) => {
                const list = paymentsByInstallmentId.get(inst.id) ?? [];
                const paidDates = list.length > 0 ? list.map((p) => formatDateBR(p.paidAt)) : inst.paidAt ? [formatDateBR(inst.paidAt)] : [];
                return (
                  <article key={inst.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          Parcela {inst.number}/{sale.installmentsCount}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">Valor: {inst.formattedAmount}</p>
                        <p className="mt-1 text-sm text-slate-600">Vencimento: {formatDateBR(inst.dueDate)}</p>
                      </div>
                      <InstallmentStatusBadge status={inst.status} isPartial={inst.isPartial} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Pago</span>
                        <span className="font-semibold text-slate-900">{inst.formattedAmountPaid}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Restante</span>
                        <span className="font-semibold text-slate-900">{inst.formattedAmountRemaining}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Pagamento(s)</span>
                        <span className="text-slate-600">
                          {paidDates.length > 0 ? paidDates.join(", ") : "—"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Histórico de recebimentos</h3>
          <p className="text-xs text-slate-500">{payments.length} registro{payments.length === 1 ? "" : "s"}</p>
        </div>

        {payments.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Sem recebimentos"
              subtitle="Esta venda ainda não possui pagamentos registrados (ou ainda não foi recebida)."
            />
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Parcela</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Forma</th>
                    <th className="px-4 py-3 font-medium">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatDateBR(p.paidAt)}</td>
                      <td className="px-4 py-3.5 text-slate-700">
                        <span className="font-medium">#{p.installmentNumber}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">
                        {p.formattedAmount}
                      </td>
                      <td className="px-4 py-3.5">
                        <PaymentBadge method={p.paymentMethod as PaymentMethod | null} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{p.notes?.trim() ? p.notes : <span className="text-slate-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {payments.map((p) => (
                <article key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        Parcela #{p.installmentNumber}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">Data: {formatDateBR(p.paidAt)}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{p.formattedAmount}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <PaymentBadge method={p.paymentMethod as PaymentMethod | null} />
                    <p className="text-xs text-slate-500">Forma</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Observação: {p.notes?.trim() ? p.notes : "—"}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta venda? Essa ação pode afetar a situação financeira da venda.
              Se já houver pagamento, o cancelamento pode ser bloqueado pelas regras do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingCancel}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={onCancelConfirmed} disabled={pendingCancel}>
              {pendingCancel ? "Cancelando..." : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSaleDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        sale={sale}
        categories={categories}
        onSaved={onEditSaved}
      />

      <ReceiveInstallmentDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        installment={receiveInstallment}
        onSaved={() => {
          setReceiveOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

