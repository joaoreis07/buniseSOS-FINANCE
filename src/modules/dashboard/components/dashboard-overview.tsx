"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CircleDollarSign,
  Handshake,
  MoreHorizontal,
  Plus,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
      {trend !== "—" && (
        <p className={`mt-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-slate-500"}`}>
          {trend} <span className="font-normal text-slate-400">vs. mês anterior</span>
        </p>
      )}
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
        title="Não foi possível carregar a tela"
        description="Toque em Tentar de novo. Se continuar, verifique sua internet."
        actionLabel="Tentar de novo"
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">
            Olá, {userName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Resumo de {data.periodLabel}
            {isFetching ? " · atualizando..." : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCustomers && (
            <Link
              href="/app/customers"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              <Users className="size-4" />
              Cadastrar cliente
            </Link>
          )}
          {canManageFinance ? (
            <Link
              href="/app/finance"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20"
            >
              <Plus className="size-4" />
              Registrar dinheiro
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
              Atualizar números
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Por onde começar?</p>
        <p className="mt-1">
          1) Cadastre um cliente · 2) Registre o que entrou ou saiu · 3) Veja as parcelas em atraso.
          Os números abaixo atualizam sozinhos.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/app/customers" className="text-blue-700 hover:underline">
            Ir para Clientes →
          </Link>
          <Link href="/app/finance" className="text-blue-700 hover:underline">
            Ir para Financeiro →
          </Link>
          <Link href="/app/receivables" className="text-blue-700 hover:underline">
            Ver parcelas →
          </Link>
          <Link href="/app/insights" className="text-blue-700 hover:underline">
            Saúde do caixa →
          </Link>
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold tracking-[-0.02em]">Como anda a receita</h3>
              <p className="mt-1 text-xs text-slate-400">
                Linha sobe = entrou mais dinheiro. Linha desce = entrou menos.
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-500">Últimos 6 meses</span>
          </div>
          <div className="relative mt-5 h-64 w-full">
            {chartData.every((item) => item.value === 0 && item.profit === 0) ? (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">
                Ainda não há receita neste período.
                <br />
                Lance uma entrada no Financeiro para ver o gráfico.
              </div>
            ) : (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardRevenueFill" x1="0" x2="0" y1="0" y2="1">
                        <stop stopColor="#083EAA" stopOpacity={0.28} />
                        <stop offset="1" stopColor="#083EAA" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dashboardProfitFill" x1="0" x2="0" y1="0" y2="1">
                        <stop stopColor="#93c5fd" stopOpacity={0.45} />
                        <stop offset="1" stopColor="#93c5fd" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "value" ? "Receita (entrou)" : "Lucro (sobrou)",
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="value"
                      stroke="#083EAA"
                      strokeWidth={2.5}
                      fill="url(#dashboardRevenueFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="profit"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      fill="url(#dashboardProfitFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#083EAA]" />
              Receita (o que entrou)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-400" />
              Lucro (o que sobrou)
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold tracking-[-0.02em]">Seu saldo e sua meta</h3>
            <Target className="size-4 text-blue-600" />
          </div>
          <div className="mt-5 grid gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Dinheiro no caixa (saldo)</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {formatCurrency(data.currentBalance)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Meta do mês</span>
                <span className="font-medium">
                  {data.monthlyGoal > 0
                    ? `${formatCurrency(data.monthlyGoal)} · ${data.goalProgressPercent.toFixed(0)}%`
                    : "Ainda não definida"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${data.monthlyGoal > 0 ? Math.min(100, data.goalProgressPercent) : 0}%`,
                  }}
                />
              </div>
              <Link
                href="/app/reports"
                className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
              >
                {data.monthlyGoal > 0 ? "Ver progresso da meta →" : "Definir minha meta →"}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">O que saiu no mês</p>
                <p className="mt-1 font-semibold">{formatCurrency(data.expensesMonth)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">Média por venda</p>
                <p className="mt-1 font-semibold">{formatCurrency(data.averageTicket)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Clientes"
          value={String(data.crm.customersCount)}
          trend="—"
          icon={Users}
        />
        <Stat
          label="Clientes inadimplentes"
          value={String(data.crm.overdueCustomers)}
          trend="—"
          icon={AlertTriangle}
        />
        <Stat
          label="Total a receber"
          value={data.crm.formattedTotalReceivable}
          trend="—"
          icon={Handshake}
        />
        <Stat
          label="Recebido no mês"
          value={data.crm.formattedReceivedMonth}
          trend="—"
          icon={CircleDollarSign}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Parcelas pendentes"
          value={String(data.crm.pendingInstallments)}
          trend="—"
          icon={CalendarDays}
        />
        <Stat
          label="Parcelas pagas"
          value={String(data.crm.paidInstallments)}
          trend="—"
          icon={Wallet}
        />
        <Stat
          label="Parcelas vencidas"
          value={String(data.crm.overdueInstallments)}
          trend="—"
          icon={AlertTriangle}
        />
        <Stat
          label="Maior cliente"
          value={data.crm.topCustomerName ?? "—"}
          trend={data.crm.topCustomerName ? data.crm.formattedTopCustomerAmount : "—"}
          icon={Users}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Últimos lançamentos</h3>
              <p className="mt-1 text-xs text-slate-400">O que entrou e saiu recentemente</p>
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
