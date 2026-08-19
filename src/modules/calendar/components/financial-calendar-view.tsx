"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  resolveWhatsAppTemplate,
} from "@/modules/crm/lib/whatsapp";
import { getCalendarOverviewAction } from "../actions/calendar.actions";
import {
  EVENT_COLORS,
  EVENT_TYPE_LABELS,
  type CalendarEventDTO,
  type CalendarOverviewDTO,
  type OverdueCustomerDTO,
} from "../dto/calendar.dto";
import { buildMonthGrid, buildWeekDays, monthKeyOf } from "../utils/calendar-grid";

type ViewMode = "month" | "week" | "day";
type FocusFilter = "all" | "overdue" | "due" | "partial" | "money";

function EventChip({
  event,
  onClick,
}: {
  event: CalendarEventDTO;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-1 w-full truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium text-white transition hover:opacity-90"
      style={{ backgroundColor: event.color }}
      title={`${event.title} · ${event.formattedAmount}`}
    >
      {event.title}
    </button>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "rose" | "amber" | "emerald" | "slate";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    slate: "border-slate-200 bg-white text-slate-900",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${tones[tone]} ${
        active ? "ring-2 ring-blue-500 ring-offset-1" : "hover:opacity-95"
      }`}
    >
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className="mt-1 text-xs opacity-70">{hint}</p>
    </button>
  );
}

export function FinancialCalendarView({
  initialData,
  initialMonthKey,
}: {
  initialData: CalendarOverviewDTO;
  initialMonthKey: string;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [focus, setFocus] = useState<FocusFilter>("all");
  const [anchor, setAnchor] = useState(() => {
    const [y, m] = initialMonthKey.split("-").map(Number);
    return startOfMonth(new Date(y, m - 1, 1));
  });
  const [selected, setSelected] = useState<CalendarEventDTO | null>(null);
  const [pending, startTransition] = useTransition();
  const monthKey = monthKeyOf(anchor);

  const { data, isFetching } = useQuery({
    queryKey: ["calendar", monthKey],
    queryFn: () => getCalendarOverviewAction(monthKey),
    initialData: monthKey === initialMonthKey ? initialData : undefined,
  });

  const events = useMemo(() => data?.events ?? [], [data]);
  const sidebar = data?.sidebar;
  const summary = data?.summary;

  const visibleEvents = useMemo(() => {
    if (focus === "overdue") return events.filter((e) => e.type === "OVERDUE");
    if (focus === "partial") return events.filter((e) => e.isPartial && e.source === "INSTALLMENT");
    if (focus === "due")
      return events.filter((e) => e.type === "DUE" || e.type === "OVERDUE" || e.type === "PARTIAL");
    if (focus === "money")
      return events.filter((e) => e.type === "INCOME" || e.type === "EXPENSE" || e.type === "RECEIPT");
    return events;
  }, [events, focus]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const event of visibleEvents) {
      const key = format(new Date(event.date), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [visibleEvents]);

  const days =
    view === "month"
      ? buildMonthGrid(anchor)
      : view === "week"
        ? buildWeekDays(anchor)
        : [anchor];

  const shift = (delta: number) => {
    startTransition(() => {
      if (view === "day") setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
      else if (view === "week")
        setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7));
      else setAnchor((d) => (delta > 0 ? addMonths(d, 1) : subMonths(d, 1)));
    });
  };

  if (!data && isFetching) return <PageSkeleton />;

  const overdueCustomers = sidebar?.overdueCustomers ?? [];
  const partialInstallments = sidebar?.partialInstallments ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Agenda do dinheiro</h2>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {format(anchor, "MMMM yyyy", { locale: ptBR })}
            {pending || isFetching ? " · atualizando..." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={view === mode ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setView(mode)}
            >
              {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
            </Button>
          ))}
          <Button type="button" size="icon" variant="outline" className="rounded-xl" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setAnchor(startOfMonth(new Date()))}
          >
            Hoje
          </Button>
          <Button type="button" size="icon" variant="outline" className="rounded-xl" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-blue-600" />
          <p>
            <strong className="font-semibold">Como usar:</strong> os cartões acima mostram o que
            precisa de atenção. Clique em um dia colorido para ver o detalhe.{" "}
            <span className="font-semibold text-rose-700">Vermelho</span> = atrasada ·{" "}
            <span className="font-semibold text-amber-600">Amarelo</span> = paga em parte (ainda
            falta) · <span className="font-semibold text-orange-600">Laranja</span> = a vencer ·{" "}
            <span className="font-semibold text-emerald-700">Verde</span> = entrada ·{" "}
            <span className="font-semibold text-rose-600">Rosa</span> = saída.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Parcelas atrasadas"
          value={summary?.formattedOverdueTotal ?? "R$ 0,00"}
          hint={`${summary?.overdueCount ?? 0} parcela(s) · clique para filtrar`}
          tone="rose"
          active={focus === "overdue"}
          onClick={() => setFocus((current) => (current === "overdue" ? "all" : "overdue"))}
        />
        <KpiCard
          label="Vence hoje"
          value={summary?.formattedDueTodayTotal ?? "R$ 0,00"}
          hint={`${summary?.dueTodayCount ?? 0} item(ns) para hoje`}
          tone="amber"
          active={focus === "due"}
          onClick={() => setFocus((current) => (current === "due" ? "all" : "due"))}
        />
        <KpiCard
          label="A receber (7 dias)"
          value={summary?.formattedDueThisWeekTotal ?? "R$ 0,00"}
          hint={`${summary?.dueThisWeekCount ?? 0} vencimento(s) próximos`}
          tone="emerald"
          active={focus === "due"}
          onClick={() => setFocus("due")}
        />
        <KpiCard
          label="Movimentações do mês"
          value={summary?.formattedProjectedIncome ?? "R$ 0,00"}
          hint={`Saídas previstas: ${summary?.formattedProjectedExpense ?? "—"}`}
          tone="slate"
          active={focus === "money"}
          onClick={() => setFocus((current) => (current === "money" ? "all" : "money"))}
        />
      </div>

      {focus !== "all" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Filtro ativo:</span>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
            {focus === "overdue"
              ? "Só atrasadas"
              : focus === "partial"
                ? "Só parciais"
                : focus === "due"
                  ? "Parcelas"
                  : "Entradas e saídas"}
          </span>
          <button
            type="button"
            className="text-blue-600 underline underline-offset-2"
            onClick={() => setFocus("all")}
          >
            Limpar filtro
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <OverdueCustomersPanel
            customers={overdueCustomers}
            onSelectEvent={setSelected}
          />

          <PartialInstallmentsPanel
            items={partialInstallments}
            onSelectEvent={setSelected}
            onFilter={() => setFocus("partial")}
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {view === "month" && (
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d} className="px-2 py-2">
                    {d}
                  </div>
                ))}
              </div>
            )}
            <div
              className={`grid ${
                view === "month" ? "grid-cols-7" : view === "week" ? "grid-cols-7" : "grid-cols-1"
              }`}
            >
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDay.get(key) ?? [];
                const inMonth = isSameMonth(day, anchor);
                const hasOverdue = dayEvents.some((e) => e.type === "OVERDUE");
                const hasPartial = dayEvents.some((e) => e.isPartial);
                return (
                  <div
                    key={key}
                    className={`min-h-[110px] border-b border-r border-slate-100 p-2 ${
                      inMonth || view !== "month" ? "bg-white" : "bg-slate-50/70"
                    } ${hasOverdue ? "bg-rose-50/40" : hasPartial ? "bg-amber-50/50" : ""}`}
                  >
                    <p
                      className={`mb-1 text-xs font-semibold ${
                        isSameDay(day, new Date())
                          ? "inline-flex size-6 items-center justify-center rounded-full bg-blue-600 text-white"
                          : hasOverdue
                            ? "text-rose-700"
                            : hasPartial
                              ? "text-amber-700"
                              : "text-slate-600"
                      }`}
                    >
                      {format(day, "d")}
                    </p>
                    {dayEvents.slice(0, view === "month" ? 3 : 8).map((event) => (
                      <EventChip key={event.id} event={event} onClick={() => setSelected(event)} />
                    ))}
                    {dayEvents.length > (view === "month" ? 3 : 8) && (
                      <p className="text-[10px] text-slate-400">
                        +{dayEvents.length - (view === "month" ? 3 : 8)} mais
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
            {(
              [
                ["OVERDUE", "Atrasada"],
                ["PARTIAL", "Parcial (falta pagar)"],
                ["DUE", "A vencer"],
                ["INCOME", "A receber"],
                ["EXPENSE", "A pagar"],
                ["RECEIPT", "Recebido"],
              ] as const
            ).map(([type, label]) => (
              <span key={type} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[type] }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <SidebarBlock
            title="Hoje"
            emptyText="Nada marcado para hoje. Bom sinal!"
            items={sidebar?.today ?? []}
            onSelect={setSelected}
          />
          <SidebarBlock
            title="Próximos 7 dias"
            emptyText="Nenhuma parcela ou cobrança próxima."
            items={sidebar?.upcomingDue ?? []}
            onSelect={setSelected}
          />
          <SidebarBlock
            title="Parcelas parciais"
            emptyText="Nenhuma parcela paga em partes no momento."
            items={sidebar?.partialInstallments ?? []}
            onSelect={setSelected}
          />
          <SidebarBlock
            title="Parcelas atrasadas"
            emptyText="Nenhuma parcela atrasada. Ótimo!"
            items={sidebar?.overdueInstallments ?? []}
            onSelect={setSelected}
            emphasize
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Atalhos úteis
            </p>
            <div className="mt-3 grid gap-2">
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/app/receivables">Abrir tela de Parcelas</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/app/customers">Ver clientes</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/app/finance">Registrar movimentação</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected ? EVENT_TYPE_LABELS[selected.type] : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid gap-2 text-sm">
              <Row label="Cliente" value={selected.customerName ?? "—"} />
              <Row label="Detalhe" value={selected.description ?? "—"} />
              {selected.source === "INSTALLMENT" ? (
                <>
                  <Row label="Valor da parcela" value={selected.formattedOriginalAmount} />
                  <Row label="Já pago" value={selected.formattedAmountPaid} />
                  <Row label="Ainda falta" value={selected.formattedAmountRemaining} />
                </>
              ) : (
                <Row label="Valor" value={selected.formattedAmount} />
              )}
              <Row label="Status" value={selected.statusLabel} />
              <Row label="Data" value={format(new Date(selected.date), "dd/MM/yyyy")} />
              <Row label="Forma de pagamento" value={selected.paymentMethod ?? "—"} />
              <Row label="Observações" value={selected.notes ?? "—"} />
              {selected.isPartial && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Esta parcela foi paga só em parte. O valor que ainda falta continuar cobrando.
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.source === "INSTALLMENT" && (
                  <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700">
                    <Link href="/app/receivables">
                      {selected.isPartial ? "Receber o que falta" : "Receber parcela"}
                    </Link>
                  </Button>
                )}
                {selected.customerId && (
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/app/customers/${selected.customerId}`}>Abrir cliente</Link>
                  </Button>
                )}
                {selected.customerPhone && selected.source === "INSTALLMENT" && (
                  <WhatsAppButton event={selected} />
                )}
                {selected.source === "TRANSACTION" && (
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/app/finance">Abrir Financeiro</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WhatsAppButton({ event }: { event: CalendarEventDTO }) {
  if (!event.customerPhone || !event.customerName) return null;
  const template = resolveWhatsAppTemplate(event.status ?? "PENDING", event.date);
  const message = buildWhatsAppMessage({
    template,
    customerName: event.customerName,
    amountLabel: event.formattedAmount,
    dueDateLabel: format(new Date(event.date), "dd/MM/yyyy"),
  });
  const url = buildWhatsAppUrl(event.customerPhone, message);
  if (!url) return null;
  return (
    <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
      <a href={url} target="_blank" rel="noreferrer">
        <MessageCircle className="mr-2 size-4" />
        Cobrar no Zap
      </a>
    </Button>
  );
}

function PartialInstallmentsPanel({
  items,
  onSelectEvent,
  onFilter,
}: {
  items: CalendarEventDTO[];
  onSelectEvent: (event: CalendarEventDTO) => void;
  onFilter: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-amber-950">Parcelas pagas em parte</h3>
          <p className="mt-0.5 text-sm text-amber-900/80">
            O cliente já pagou alguma coisa, mas ainda falta dinheiro. Não confunda com parcela
            quitada.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl border-amber-200 bg-white"
          onClick={onFilter}
        >
          Ver no calendário
        </Button>
      </div>
      <ul className="mt-4 grid gap-2">
        {items.slice(0, 8).map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelectEvent(item)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">
                  {item.customerName ?? item.title}
                </span>
                <span className="text-xs text-slate-500">
                  Pago {item.formattedAmountPaid} · falta{" "}
                  <span className="font-semibold text-amber-700">{item.formattedAmountRemaining}</span>
                  {" · "}
                  {format(new Date(item.date), "dd/MM")}
                </span>
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Parcial
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverdueCustomersPanel({
  customers,
  onSelectEvent,
}: {
  customers: OverdueCustomerDTO[];
  onSelectEvent: (event: CalendarEventDTO) => void;
}) {
  if (customers.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-900">
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong className="font-semibold">Nenhum cliente atrasado.</strong> Quando alguém
            ficar com parcela vencida, o nome aparece aqui para você cobrar rápido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h3 className="font-semibold text-rose-950">Clientes com parcelas atrasadas</h3>
            <p className="mt-0.5 text-sm text-rose-800/80">
              {customers.length} cliente(s) precisam de cobrança. Clique para ver a parcela ou abra
              o WhatsApp.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-xl border-rose-200 bg-white">
          <Link href="/app/receivables">Ver todas as parcelas</Link>
        </Button>
      </div>
      <ul className="mt-4 grid gap-2">
        {customers.slice(0, 8).map((customer) => {
          const first = customer.events[0];
          const wa =
            customer.customerPhone && first
              ? buildWhatsAppUrl(
                  customer.customerPhone,
                  buildWhatsAppMessage({
                    template: "OVERDUE",
                    customerName: customer.customerName,
                    amountLabel: customer.formattedTotalAmount,
                    dueDateLabel: customer.oldestDueDateLabel,
                  }),
                )
              : null;
          return (
            <li
              key={customer.customerId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white px-3 py-3"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => first && onSelectEvent(first)}
              >
                <p className="truncate font-medium text-slate-900">{customer.customerName}</p>
                <p className="text-xs text-slate-500">
                  {customer.installmentsCount} parcela(s) · desde {customer.oldestDueDateLabel} ·{" "}
                  <span className="font-semibold text-rose-700">{customer.formattedTotalAmount}</span>
                </p>
              </button>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-lg">
                  <Link href={`/app/customers/${customer.customerId}`}>Abrir</Link>
                </Button>
                {wa ? (
                  <Button asChild size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
                    <a href={wa} target="_blank" rel="noreferrer">
                      <MessageCircle className="mr-1.5 size-3.5" />
                      Cobrar
                    </a>
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function SidebarBlock({
  title,
  emptyText,
  items,
  onSelect,
  emphasize = false,
}: {
  title: string;
  emptyText: string;
  items: CalendarEventDTO[];
  onSelect: (event: CalendarEventDTO) => void;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        emphasize ? "border-rose-200 bg-rose-50/50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          emphasize ? "text-rose-500" : "text-slate-400"
        }`}
      >
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 8).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="flex w-full items-start gap-2 rounded-xl px-1 py-1 text-left hover:bg-white/80"
              >
                <span
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {item.customerName ?? item.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {item.isPartial
                      ? `Falta ${item.formattedAmountRemaining} · pago ${item.formattedAmountPaid}`
                      : item.formattedAmount}{" "}
                    · {format(new Date(item.date), "dd/MM")}
                    {item.type === "OVERDUE" ? " · atrasada" : ""}
                    {item.type === "PARTIAL" ? " · parcial" : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
