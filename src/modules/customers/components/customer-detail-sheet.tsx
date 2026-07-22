"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { EmptyState } from "@/shared/components/empty-state";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import type { CustomerClientDTO, CustomerDetailClientDTO } from "../dto/customer.dto";
import {
  deleteCustomerAction,
  getCustomerDetailAction,
} from "../actions/customer.actions";
import { CustomerStatusBadge } from "./customer-status-badge";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

const TYPE_LABEL: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência",
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado",
};

export function CustomerDetailSheet({
  customerId,
  open,
  onOpenChange,
  canManage,
  onEdit,
  onDeleted,
}: {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit: (customer: CustomerClientDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const [detail, setDetail] = useState<CustomerDetailClientDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !customerId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getCustomerDetailAction({ id: customerId }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        toast.error(result.error);
        onOpenChange(false);
        return;
      }
      setDetail(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [open, customerId, onOpenChange]);

  const handleDelete = () => {
    if (!customerId) return;
    startTransition(async () => {
      const result = await deleteCustomerAction({ id: customerId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cliente removido");
      setConfirmDelete(false);
      onOpenChange(false);
      onDeleted(customerId);
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader className="border-b border-slate-100 pb-4">
            <SheetTitle>{detail?.customer.name ?? "Cliente"}</SheetTitle>
            <SheetDescription>
              Dados cadastrais e histórico financeiro
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 p-4">
            {loading && <PageSkeleton />}

            {!loading && detail && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CustomerStatusBadge status={detail.customer.status} />
                  {canManage && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => onEdit(detail.customer)}
                      >
                        <Pencil className="mr-1.5 size-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Remover
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                  <InfoRow label="E-mail" value={detail.customer.email} />
                  <InfoRow label="Telefone" value={detail.customer.phone} />
                  <InfoRow label="Documento" value={detail.customer.document} />
                  <InfoRow
                    label="Cidade"
                    value={
                      [detail.customer.city, detail.customer.state]
                        .filter(Boolean)
                        .join(" / ") || null
                    }
                  />
                  <InfoRow label="Endereço" value={detail.customer.address} />
                  <InfoRow label="Observações" value={detail.customer.notes} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard
                    label="Recebido"
                    value={formatCurrency(detail.summary.incomePaid)}
                  />
                  <SummaryCard
                    label="Pago"
                    value={formatCurrency(detail.summary.expensePaid)}
                  />
                  <SummaryCard
                    label="Saldo"
                    value={formatCurrency(detail.summary.balance)}
                  />
                  <SummaryCard
                    label="A receber"
                    value={formatCurrency(detail.summary.pendingIncome)}
                  />
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold">Histórico financeiro</h4>
                  {detail.history.length === 0 ? (
                    <EmptyState
                      title="Sem movimentações"
                      description="Este cliente ainda não possui lançamentos financeiros."
                    />
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-3 py-2 font-medium">Data</th>
                            <th className="px-3 py-2 font-medium">Descrição</th>
                            <th className="px-3 py-2 text-right font-medium">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.history.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="px-3 py-2.5 text-xs text-slate-500">
                                {formatDate(item.date)}
                                <div className="mt-0.5 text-[10px] uppercase text-slate-400">
                                  {TYPE_LABEL[item.type]} · {STATUS_LABEL[item.status]}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                {item.description ?? "Movimentação"}
                              </td>
                              <td
                                className={`px-3 py-2.5 text-right font-semibold ${
                                  item.type === "EXPENSE"
                                    ? "text-rose-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {item.type === "EXPENSE" ? "-" : "+"}
                                {item.formattedAmount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente será ocultado (soft delete) e não aparecerá mais na listagem.
              O histórico financeiro permanece no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {pending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}
