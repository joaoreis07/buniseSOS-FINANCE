"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  Search,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/components/ui/utils";
import { PaymentBadge } from "@/modules/finance/components/payment-badge";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, type PaymentMethod } from "@/modules/finance/types";
import type {
  ListSalesInput,
  SaleListItemDTO,
  SaleListPeriod,
  SaleListResultDTO,
  SaleListStatus,
} from "@/modules/crm/dto/crm.dto";
import { SaleStatusBadge } from "@/modules/crm/components/financial-status-badge";
import { listSalesAction } from "../actions/sales.actions";

const PERIODS: Array<{ id: SaleListPeriod; label: string }> = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "todos", label: "Todos" },
  { id: "personalizado", label: "Personalizado" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof ShoppingBag;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", accent)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-5 break-words text-2xl font-semibold tracking-[-0.04em] text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </motion.div>
  );
}

export function SalesListView({
  initialData,
  canManage = false,
}: {
  initialData: SaleListResultDTO;
  canManage?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<SaleListPeriod>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [status, setStatus] = useState<"ALL" | SaleListStatus>("ALL");
  const [paymentMethod, setPaymentMethod] = useState<"ALL" | PaymentMethod>("ALL");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const skipFirst = useRef(true);

  const filters: ListSalesInput = {
    search: search.trim() || undefined,
    period,
    customFrom: period === "personalizado" ? customFrom || undefined : undefined,
    customTo: period === "personalizado" ? customTo || undefined : undefined,
    status,
    paymentMethod,
    page,
    pageSize: 20,
  };

  const load = (next: ListSalesInput) => {
    startTransition(async () => {
      const result = await listSalesAction(next);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      setData(result.data);
    });
  };

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (period === "personalizado" && (!customFrom || !customTo)) return;
    const handle = window.setTimeout(() => load(filters), search ? 300 : 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load uses latest filters snapshot
  }, [search, period, customFrom, customTo, status, paymentMethod, page]);

  const changePeriod = (next: SaleListPeriod) => {
    setPeriod(next);
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    status !== "ALL" ||
    paymentMethod !== "ALL" ||
    period !== "mes";
  const empty = data.items.length === 0;
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="grid min-w-0 max-w-full gap-5 overflow-x-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Vendas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as vendas da sua empresa
            {pending ? " · atualizando..." : ""}
          </p>
        </div>
        {canManage ? (
          <Button asChild className="h-11 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700">
            <Link href="/app/sales/new">
              <ShoppingCart className="mr-2 size-4" />
              Nova venda
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            title="Você não tem permissão para criar vendas"
            className="h-11 rounded-xl bg-blue-600 disabled:opacity-60"
          >
            <ShoppingCart className="mr-2 size-4" />
            Nova venda
          </Button>
        )}
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total vendido"
          value={data.indicators.formattedTotalSold}
          hint={`Período: ${data.indicators.periodLabel}`}
          icon={ShoppingBag}
          accent="bg-blue-50 text-blue-600"
          delay={0.05}
        />
        <StatCard
          label="Número de vendas"
          value={String(data.indicators.salesCount)}
          hint={`Período: ${data.indicators.periodLabel}`}
          icon={Receipt}
          accent="bg-emerald-50 text-emerald-600"
          delay={0.1}
        />
        <StatCard
          label="Ticket médio"
          value={data.indicators.formattedAverageTicket}
          hint={`Período: ${data.indicators.periodLabel}`}
          icon={TrendingUp}
          accent="bg-violet-50 text-violet-600"
          delay={0.15}
        />
      </div>

      <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changePeriod(item.id)}
            className={cn(
              "h-10 shrink-0 rounded-xl border px-3 text-sm font-medium transition",
              period === item.id
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {period === "personalizado" ? (
        <div className="flex min-w-0 flex-wrap gap-3">
          <Input
            type="date"
            value={customFrom}
            onChange={(event) => {
              setCustomFrom(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl sm:max-w-[180px]"
          />
          <Input
            type="date"
            value={customTo}
            onChange={(event) => {
              setCustomTo(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-xl sm:max-w-[180px]"
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:basis-[200px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cliente, descrição ou código"
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value: "ALL" | SaleListStatus) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="PARTIAL">Parcial</SelectItem>
            <SelectItem value="OVERDUE">Atrasado</SelectItem>
            <SelectItem value="CANCELED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={paymentMethod}
          onValueChange={(value: "ALL" | PaymentMethod) => {
            setPaymentMethod(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[220px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as formas</SelectItem>
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <SelectItem key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {empty ? (
        pending ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
            Carregando vendas...
          </div>
        ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
            <ShoppingBag className="size-5" />
          </span>
          <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-slate-900">
            {hasActiveFilters ? "Nenhuma venda encontrada" : "Não há vendas cadastradas."}
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {hasActiveFilters
              ? "Ajuste a busca, o período ou os filtros para ver outros resultados."
              : "Quando você registrar vendas, elas aparecem aqui."}
          </p>
          {canManage ? (
            <Button asChild className="mt-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-700">
              <Link href="/app/sales/new">
                <ShoppingCart className="mr-2 size-4" />
                Nova venda
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              title="Você não tem permissão para criar vendas"
              className="mt-5 h-11 rounded-xl bg-blue-600 disabled:opacity-60"
            >
              <ShoppingCart className="mr-2 size-4" />
              Nova venda
            </Button>
          )}
        </div>
        )
      ) : (
        <>
        <div className={pending ? "opacity-60" : undefined} aria-busy={pending}>
          <div className="grid gap-3 md:hidden">
            {data.items.map((item) => (
              <SaleMobileCard key={item.id} item={item} />
            ))}
          </div>

          <div className="hidden min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Pagamento</th>
                    <th className="px-4 py-3 font-medium">Condição</th>
                    <th className="px-4 py-3 font-medium">Itens</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                        <Link href={`/app/sales/${item.id}`} className="hover:text-blue-700">
                          <p>{formatDate(item.soldAt)}</p>
                          <p className="text-[11px] text-slate-400">#{item.code}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <CustomerCell item={item} />
                      </td>
                      <td className="max-w-[220px] px-4 py-3.5 text-slate-600">
                        <Link
                          href={`/app/sales/${item.id}`}
                          className="block truncate hover:text-blue-700"
                          title={item.description}
                        >
                          {item.description}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900">
                        {item.formattedTotalAmount}
                      </td>
                      <td className="px-4 py-3.5">
                        <PaymentBadge method={item.paymentMethod as PaymentMethod} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {item.paymentConditionLabel}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {item.itemCount > 0 ? item.itemCount : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <SaleStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {data.total} venda{data.total === 1 ? "" : "s"} · página {data.page} de {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                disabled={page <= 1 || pending}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                disabled={page >= pageCount || pending}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function CustomerCell({ item }: { item: SaleListItemDTO }) {
  if (!item.customerId || item.customerName === "Sem cliente") {
    return <span className="text-slate-400">Sem cliente</span>;
  }
  return (
    <Link
      href={`/app/customers/${item.customerId}`}
      className="font-medium text-slate-900 hover:text-blue-700"
    >
      {item.customerName}
    </Link>
  );
}

function SaleMobileCard({ item }: { item: SaleListItemDTO }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CustomerCell item={item} />
          <p className="mt-1 break-words text-sm text-slate-500">{item.description}</p>
        </div>
        <SaleStatusBadge status={item.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
          {item.formattedTotalAmount}
        </p>
        <p className="text-xs text-slate-400">
          {formatDate(item.soldAt)} · #{item.code}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PaymentBadge method={item.paymentMethod as PaymentMethod} />
        <span className="text-xs text-slate-500">{item.paymentConditionLabel}</span>
        <span className="text-xs text-slate-400">
          {item.itemCount > 0
            ? `${item.itemCount} ${item.itemCount === 1 ? "item" : "itens"}`
            : "Sem itens"}
        </span>
      </div>
      <div className="mt-4">
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link href={`/app/sales/${item.id}`}>Ver detalhe</Link>
        </Button>
      </div>
    </article>
  );
}
