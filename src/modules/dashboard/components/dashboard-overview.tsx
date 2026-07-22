"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  MoreHorizontal,
  Plus,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { getDashboardAction } from "../actions/dashboard.actions";
import type { DashboardResponseDTO } from "../dto/dashboard.dto";

function Stat({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: typeof Wallet;
}) {
  const positive = !trend.startsWith("-") && trend !== "—";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className={`mt-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-slate-500"}`}>
        {trend} <span className="font-normal text-slate-400">vs. mês anterior</span>
      </p>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function DashboardOverview({
  userName,
  initialData,
  canManageFinance = false,
  canManageCustomers = false,
}: {
  userName: string;
  initialData: DashboardResponseDTO;
  canManageFinance?: boolean;
  canManageCustomers?: boolean;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", initialData.companyId],
    queryFn: () => getDashboardAction(),
    initialData,
  });

  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Não foi possível carregar o dashboard"
        description="Tente novamente em instantes."
        actionLabel="Recarregar"
        onAction={() => {
          void refetch();
        }}
      />
    );
  }

  const [revenueKpi, profitKpi, customersKpi, newCustomersKpi] = data.kpis;
  const chartData = data.monthlyComparison.map((item) => ({
    month: item.month,
    value: item.revenue,
    profit: item.profit,
  }));

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">
            Bom dia, {userName} <span>✦</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Resumo de {data.periodLabel}
            {isFetching ? " · atualizando..." : ""}. Lance entradas e saídas em Financeiro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCustomers && (
            <Link
              href="/app/customers"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              <Users className="size-4" />
              Novo cliente
            </Link>
          )}
          {canManageFinance ? (
            <Link
              href="/app/finance"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20"
            >
              <Plus className="size-4" />
              Nova movimentação
            </Link>
          ) : (
            <button
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20"
              type="button"
              onClick={() => {
                void refetch();
              }}
            >
              <Plus className="size-4" />
              Atualizar dados
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={revenueKpi?.label ?? "Receita do mês"}
          value={revenueKpi?.formatted ?? "R$ 0,00"}
          trend={revenueKpi?.trendLabel ?? "—"}
          icon={CircleDollarSign}
        />
        <Stat
          label={profitKpi?.label ?? "Lucro líquido"}
          value={profitKpi?.formatted ?? "R$ 0,00"}
          trend={profitKpi?.trendLabel ?? "—"}
          icon={Wallet}
        />
        <Stat
          label={customersKpi?.label ?? "Clientes ativos"}
          value={customersKpi?.formatted ?? "0"}
          trend={customersKpi?.trendLabel ?? "—"}
          icon={Users}
        />
        <Stat
          label={newCustomersKpi?.label ?? "Novos clientes"}
          value={newCustomersKpi?.formatted ?? "0"}
          trend={newCustomersKpi?.trendLabel ?? "—"}
          icon={CalendarDays}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold tracking-[-0.02em]">Receita mensal</h3>
              <p className="mt-1 text-xs text-slate-400">
                {formatCurrency(data.revenueMonth)} em {data.periodLabel}
              </p>
            </div>
            <button className="text-xs font-medium text-slate-500" type="button">
              Últimos 6 meses <ChevronDown className="ml-1 inline size-3" />
            </button>
          </div>
          <div className="mt-5 h-64">
            {chartData.every((item) => item.value === 0 && item.profit === 0) ? (
              <div className="grid h-full place-items-center text-sm text-slate-400">
                Sem movimentações no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={28}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" name="Receita" fill="#083EAA" radius={[7, 7, 0, 0]} />
                  <Bar dataKey="profit" name="Lucro" fill="#adc9ef" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold tracking-[-0.02em]">Meta e saldo</h3>
            <Target className="size-4 text-blue-600" />
          </div>
          <div className="mt-5 grid gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Saldo atual</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {formatCurrency(data.currentBalance)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Meta mensal</span>
                <span className="font-medium">
                  {formatCurrency(data.monthlyGoal)} · {data.goalProgressPercent.toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${Math.min(100, data.goalProgressPercent)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">Despesas do mês</p>
                <p className="mt-1 font-semibold">{formatCurrency(data.expensesMonth)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">Ticket médio</p>
                <p className="mt-1 font-semibold">{formatCurrency(data.averageTicket)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Últimas movimentações</h3>
              <p className="mt-1 text-xs text-slate-400">Receitas e despesas recentes</p>
            </div>
            <button
              className="grid size-8 place-items-center rounded-lg border border-slate-200"
              type="button"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            {data.recentMovements.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Nenhuma movimentação ainda</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="pb-3 font-medium">Descrição</th>
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMovements.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-3 font-medium">{item.description}</td>
                      <td className="py-3 text-xs text-slate-500">
                        {item.customerName ?? "—"}
                      </td>
                      <td
                        className={`py-3 text-right font-semibold ${
                          item.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {item.type === "EXPENSE" ? "-" : "+"}
                        {item.formattedAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            <Bell className="size-4 text-slate-400" />
          </div>
          <div className="mt-4 grid gap-3">
            {data.notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Sem notificações</p>
            ) : (
              data.notifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    {!item.read && <span className="mt-1 size-1.5 rounded-full bg-blue-600" />}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
