"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/modules/finance/types";
import { formatCivilDatePtBr } from "../lib/civil-date";
import type {
  BoardInstallmentDTO,
  CustomerInstallmentsBoardDTO,
  InstallmentDTO,
  InstallmentPaymentHistoryDTO,
} from "../dto/crm.dto";
import { InstallmentStatusBadge } from "./financial-status-badge";

function formatPaidAt(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
    new Date(value),
  );
}

function paymentLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

function dueHint(item: BoardInstallmentDTO): string | null {
  if (item.daysOverdue != null) {
    return item.daysOverdue === 1 ? "1 dia em atraso" : `${item.daysOverdue} dias em atraso`;
  }
  if (item.daysUntilDue == null) return null;
  if (item.daysUntilDue === 0) return "Vence hoje";
  if (item.daysUntilDue === 1) return "Vence amanhã";
  return `Vence em ${item.daysUntilDue} dias`;
}

function canReceive(item: InstallmentDTO): boolean {
  return item.status !== "PAID" && item.status !== "CANCELED";
}

function AmountBreakdown({
  item,
  muted = false,
}: {
  item: BoardInstallmentDTO;
  muted?: boolean;
}) {
  if (muted) {
    return <p className="text-sm font-medium text-slate-600">{item.formattedAmount}</p>;
  }
  return (
    <div>
      <p className="text-sm font-medium text-slate-900">
        {item.formattedAmountRemaining} a receber
      </p>
      {item.isPartial ? (
        <p className="text-xs text-slate-500">
          Parcela {item.formattedAmount} · pago {item.formattedAmountPaid} · restante{" "}
          {item.formattedAmountRemaining}
        </p>
      ) : null}
    </div>
  );
}

function InstallmentActions({
  item,
  canManageFinance,
  onReceive,
  onEdit,
}: {
  item: InstallmentDTO;
  canManageFinance: boolean;
  onReceive: (item: InstallmentDTO) => void;
  onEdit: (item: InstallmentDTO) => void;
}) {
  if (!canManageFinance || !canReceive(item)) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg"
        onClick={() => onEdit(item)}
      >
        <Pencil className="mr-1.5 size-3.5" />
        Editar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg"
        onClick={() => onReceive(item)}
      >
        {item.isPartial ? "Receber saldo" : "Receber"}
      </Button>
    </div>
  );
}

function InstallmentRow({
  item,
  canManageFinance,
  muted = false,
  onReceive,
  onEdit,
}: {
  item: BoardInstallmentDTO;
  canManageFinance: boolean;
  muted?: boolean;
  onReceive: (item: InstallmentDTO) => void;
  onEdit: (item: InstallmentDTO) => void;
}) {
  const hint = dueHint(item);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-medium ${muted ? "text-slate-600" : "text-slate-900"}`}>
            Parcela #{item.number}
          </p>
          <InstallmentStatusBadge status={item.status} isPartial={item.isPartial} />
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{item.saleDescription}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
          <AmountBreakdown item={item} muted={muted} />
          <p className="text-sm text-slate-500">Venc. {formatCivilDatePtBr(item.dueDate)}</p>
          {hint ? (
            <p className={`text-sm ${item.daysOverdue != null ? "font-medium text-rose-600" : "text-slate-500"}`}>
              {hint}
            </p>
          ) : null}
          {muted && item.paidAt ? (
            <p className="text-sm text-slate-400">
              Pago em {formatPaidAt(item.paidAt)}
              {item.paymentMethod ? ` · ${paymentLabel(item.paymentMethod)}` : ""}
            </p>
          ) : null}
        </div>
      </div>
      <InstallmentActions
        item={item}
        canManageFinance={canManageFinance}
        onReceive={onReceive}
        onEdit={onEdit}
      />
    </div>
  );
}

function InstallmentGroup({
  title,
  description,
  items,
  canManageFinance,
  emphasis = false,
  muted = false,
  onReceive,
  onEdit,
}: {
  title: string;
  description: string;
  items: BoardInstallmentDTO[];
  canManageFinance: boolean;
  emphasis?: boolean;
  muted?: boolean;
  onReceive: (item: InstallmentDTO) => void;
  onEdit: (item: InstallmentDTO) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`border-b px-4 py-3 ${
          emphasis ? "border-rose-100 bg-rose-50" : muted ? "border-slate-100 bg-slate-50/70" : "border-slate-100 bg-slate-50"
        }`}
      >
        <p className={`text-sm font-semibold ${emphasis ? "text-rose-800" : muted ? "text-slate-500" : "text-slate-800"}`}>
          {title}
        </p>
        <p className={`text-xs ${emphasis ? "text-rose-500" : "text-slate-400"}`}>{description}</p>
      </div>
      <div>
        {items.map((item) => (
          <InstallmentRow
            key={item.id}
            item={item}
            canManageFinance={canManageFinance}
            muted={muted}
            onReceive={onReceive}
            onEdit={onEdit}
          />
        ))}
      </div>
    </section>
  );
}

export function CustomerInstallmentsBoard({
  board,
  payments,
  canManageFinance,
  onReceive,
  onEdit,
}: {
  board: CustomerInstallmentsBoardDTO;
  payments: InstallmentPaymentHistoryDTO[];
  canManageFinance: boolean;
  onReceive: (item: InstallmentDTO) => void;
  onEdit: (item: InstallmentDTO) => void;
}) {
  const highlight = board.highlight;
  const isOverdueHighlight = board.highlightKind === "OVERDUE";

  return (
    <div className="grid gap-4">
      <div
        className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
          isOverdueHighlight
            ? "border-rose-200 bg-white"
            : "border-slate-200 bg-white"
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            isOverdueHighlight ? "text-rose-500" : "text-slate-400"
          }`}
        >
          {board.highlightKind === "OVERDUE" ? "Parcela atrasada" : "Próxima parcela"}
        </p>
        {highlight ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-[-0.04em] text-slate-900">
                {highlight.formattedAmountRemaining} a receber
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Parcela #{highlight.number} · venc. {formatCivilDatePtBr(highlight.dueDate)}
                {dueHint(highlight) ? ` · ${dueHint(highlight)}` : ""}
              </p>
              {highlight.isPartial ? (
                <p className="mt-1 text-xs text-slate-400">
                  Parcela {highlight.formattedAmount} · pago {highlight.formattedAmountPaid} · restante{" "}
                  {highlight.formattedAmountRemaining}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">{highlight.saleDescription}</p>
              )}
              <div className="mt-2">
                <InstallmentStatusBadge status={highlight.status} isPartial={highlight.isPartial} />
              </div>
            </div>
            {canManageFinance ? (
              <Button
                type="button"
                className="shrink-0 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                onClick={() => onReceive(highlight)}
              >
                {highlight.isPartial ? "Receber saldo" : "Receber"}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Não há parcelas pendentes.</p>
        )}
      </div>

      <InstallmentGroup
        title="Atrasadas"
        description={
          board.overdue.length === 1
            ? "1 parcela em atraso"
            : `${board.overdue.length} parcelas em atraso`
        }
        items={board.overdue}
        canManageFinance={canManageFinance}
        emphasis
        onReceive={onReceive}
        onEdit={onEdit}
      />
      <InstallmentGroup
        title="Próximas"
        description="Pendentes com vencimento nos próximos 30 dias"
        items={board.upcoming}
        canManageFinance={canManageFinance}
        onReceive={onReceive}
        onEdit={onEdit}
      />
      <InstallmentGroup
        title="Pendentes"
        description="Vencimento ainda não está próximo"
        items={board.pending}
        canManageFinance={canManageFinance}
        onReceive={onReceive}
        onEdit={onEdit}
      />
      <InstallmentGroup
        title="Pagas"
        description={
          board.paid.length === 1 ? "1 parcela quitada" : `${board.paid.length} parcelas quitadas`
        }
        items={board.paid}
        canManageFinance={canManageFinance}
        muted
        onReceive={onReceive}
        onEdit={onEdit}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <p className="text-sm font-semibold text-slate-500">Histórico de pagamentos</p>
          <p className="text-xs text-slate-400">Registros reais de recebimento desta ficha</p>
        </div>
        {payments.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ul>
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{payment.formattedAmount}</p>
                  <p className="text-xs text-slate-400">
                    Parcela #{payment.installmentNumber} · {payment.saleDescription}
                  </p>
                  {payment.notes?.trim() ? (
                    <p className="mt-0.5 text-xs text-slate-400">{payment.notes}</p>
                  ) : null}
                </div>
                <p className="text-sm text-slate-500">
                  {formatPaidAt(payment.paidAt)}
                  {payment.paymentMethod ? ` · ${paymentLabel(payment.paymentMethod)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
