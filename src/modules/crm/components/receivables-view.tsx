"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Handshake, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/modules/finance/types";
import type { InstallmentDTO, ReceivablesOverviewDTO } from "../dto/crm.dto";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  resolveWhatsAppTemplate,
} from "../lib/whatsapp";
import { getReceivablesAction } from "../actions/crm.actions";
import { InstallmentStatusBadge } from "./financial-status-badge";
import { ReceiveInstallmentDialog } from "./receive-installment-dialog";
import { SaleFormDialog } from "./sale-form-dialog";

type StatusFilter = "all" | "pending" | "paid" | "overdue";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todas do mês" },
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Pagas" },
  { key: "overdue", label: "Vencidas" },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function paymentLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ReceivablesView({
  initialData,
  customers,
  categories,
  canManage,
}: {
  initialData: ReceivablesOverviewDTO;
  customers: Array<{ id: string; name: string; phone?: string | null; whatsapp?: string | null }>;
  categories: Array<{ id: string; name: string }>;
  canManage: boolean;
}) {
  const phoneByCustomer = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers) {
      const phone = customer.whatsapp || customer.phone;
      if (phone) map.set(customer.id, phone);
    }
    return map;
  }, [customers]);

  const openWhatsApp = (item: InstallmentDTO) => {
    const phone = phoneByCustomer.get(item.customerId);
    if (!phone) {
      toast.error("Cliente sem WhatsApp/telefone cadastrado");
      return;
    }
    const template = resolveWhatsAppTemplate(item.status, item.dueDate);
    const message = buildWhatsAppMessage({
      template,
      customerName: item.customerName,
      amountLabel: item.isPartial ? item.formattedAmountRemaining : item.formattedAmount,
      dueDateLabel: formatDate(item.dueDate),
    });
    const url = buildWhatsAppUrl(phone, message);
    if (!url) {
      toast.error("Telefone inválido para WhatsApp");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [yearMonth, setYearMonth] = useState(initialData.yearMonth || currentYearMonth());
  const [data, setData] = useState(initialData);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [selected, setSelected] = useState<InstallmentDTO | null>(null);

  useEffect(() => {
    setData(initialData);
    setYearMonth(initialData.yearMonth || currentYearMonth());
  }, [initialData]);

  const load = (nextMonth: string, nextStatus: StatusFilter) => {
    setYearMonth(nextMonth);
    setStatus(nextStatus);
    startTransition(async () => {
      const result = await getReceivablesAction({
        yearMonth: nextMonth,
        status: nextStatus,
      });
      if (result.success) setData(result.data);
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, InstallmentDTO[]>();
    for (const item of data.items) {
      const key = item.dueDate.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [data.items]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Parcelas a receber</h2>
          <p className="mt-1 text-sm text-slate-500">
            Veja o que falta receber no mês
            {pending ? " · atualizando..." : ""}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Use <span className="font-semibold text-emerald-700">Cobrar no Zap</span> para abrir o
            WhatsApp com a mensagem pronta. Use <span className="font-semibold">Receber</span>{" "}
            quando o cliente pagar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline" className="rounded-xl">
            <Link href="/app/customers">Ver clientes</Link>
          </Button>
          {canManage && customers.length > 0 && (
            <Button
              type="button"
              onClick={() => setSaleOpen(true)}
              className="rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Plus className="mr-2 size-4" />
              Nova venda
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => load(shiftYearMonth(yearMonth, -1), status)}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[160px] text-center">
              <p className="text-sm font-semibold capitalize text-slate-900">{data.periodLabel}</p>
              <p className="text-xs text-slate-400">visão mensal das parcelas</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => load(shiftYearMonth(yearMonth, 1), status)}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => load(currentYearMonth(), status)}
          >
            Este mês
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">A receber no mês</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            {data.formattedTotalReceivable}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Recebido no mês</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-emerald-700">
            {data.formattedTotalReceived}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Vencido no mês</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-rose-600">
            {data.formattedTotalOverdue}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => load(yearMonth, item.key)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              status === item.key
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma parcela neste mês"
          description={
            canManage
              ? "Registre uma venda parcelada em Clientes ou pelo botão Nova venda."
              : "Quando houver vendas parceladas, elas aparecem aqui por mês."
          }
          icon={Handshake}
          actionLabel={canManage && customers.length > 0 ? "Nova venda" : undefined}
          onAction={canManage && customers.length > 0 ? () => setSaleOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4">
          {grouped.map(([day, items]) => (
            <div
              key={day}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{formatDate(day)}</p>
                <p className="text-xs text-slate-400">
                  {items.length} parcela{items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Parcela</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/app/customers/${item.customerId}`}
                            className="font-medium text-slate-900 hover:text-blue-700"
                          >
                            {item.customerName}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{item.saleDescription}</td>
                        <td className="px-4 py-3.5">#{item.number}</td>
                        <td className="px-4 py-3.5">
                          <p>{item.formattedAmount}</p>
                          {item.isPartial && (
                            <p className="text-xs text-slate-400">
                              Pago {item.formattedAmountPaid} · falta {item.formattedAmountRemaining}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <InstallmentStatusBadge status={item.status} isPartial={item.isPartial} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-2">
                            {canManage && item.status !== "PAID" && item.status !== "CANCELED" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onClick={() => {
                                  setSelected(item);
                                  setReceiveOpen(true);
                                }}
                              >
                                {item.isPartial ? "Receber saldo" : "Receber"}
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-lg text-emerald-700"
                              onClick={() => openWhatsApp(item)}
                            >
                              <MessageCircle className="mr-1 size-3.5" />
                              Cobrar no Zap
                            </Button>
                            {item.status === "PAID" && (
                              <span className="self-center text-xs text-slate-400">
                                {paymentLabel(item.paymentMethod)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReceiveInstallmentDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        installment={selected}
        onSaved={() => {
          load(yearMonth, status);
          router.refresh();
        }}
      />

      <SaleFormDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
        customers={customers}
        categories={categories}
        onSaved={() => {
          load(yearMonth, status);
          router.refresh();
        }}
      />
    </div>
  );
}
