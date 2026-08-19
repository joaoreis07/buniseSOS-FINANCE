"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InsightsOverviewDTO } from "../dto/insights.dto";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function ScoreCard({
  score,
  statusLabel,
  status,
}: {
  score: number;
  statusLabel: string;
  status: InsightsOverviewDTO["status"];
}) {
  const color =
    status === "EXCELLENT"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status === "GOOD"
        ? "text-blue-700 bg-blue-50 border-blue-200"
        : status === "ATTENTION"
          ? "text-amber-700 bg-amber-50 border-amber-200"
          : "text-rose-700 bg-rose-50 border-rose-200";
  const bar =
    status === "EXCELLENT"
      ? "bg-emerald-500"
      : status === "GOOD"
        ? "bg-blue-600"
        : status === "ATTENTION"
          ? "bg-amber-500"
          : "bg-rose-500";

  return (
    <section className={`rounded-2xl border p-6 shadow-sm ${color}`}>
      <p className="text-sm font-medium opacity-80">Saúde Financeira</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-5xl font-semibold tracking-[-0.05em]">{score}</p>
          <p className="mt-1 text-sm">de 100 pontos</p>
        </div>
        <div className="rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold">{statusLabel}</div>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/60">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
    </section>
  );
}

function Indicator({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-900">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 h-56">{children}</div>
    </div>
  );
}

export function InsightsView({ data }: { data: InsightsOverviewDTO }) {
  const { indicators, charts, insights } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">Saúde do seu caixa</h2>
        <p className="mt-1 text-sm text-slate-500">
          Um resumo simples do mês ·{" "}
          <span className="capitalize">{data.periodLabel}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
        Aqui você vê se o mês está bom ou precisa de atenção — sem planilha e sem complicação.
        Comece olhando a nota de saúde e as mensagens em amarelo/verde abaixo.
      </div>

      <ScoreCard score={data.score} status={data.status} statusLabel={data.statusLabel} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicator
          label="Receita do mês"
          value={indicators.formatted.revenueMonth}
          icon={TrendingUp}
        />
        <Indicator
          label="Despesas do mês"
          value={indicators.formatted.expensesMonth}
          icon={TrendingDown}
        />
        <Indicator
          label="Lucro líquido"
          value={indicators.formatted.profitMonth}
          icon={CircleDollarSign}
        />
        <Indicator label="Fluxo de caixa" value={indicators.formatted.cashFlow} icon={Wallet} />
        <Indicator
          label="Receita prevista"
          value={indicators.formatted.projectedIncome}
          icon={TrendingUp}
        />
        <Indicator
          label="Despesa prevista"
          value={indicators.formatted.projectedExpense}
          icon={TrendingDown}
        />
        <Indicator label="Clientes ativos" value={indicators.activeCustomers} icon={Users} />
        <Indicator
          label="Clientes inadimplentes"
          value={indicators.delinquentCustomers}
          icon={AlertTriangle}
        />
        <Indicator label="Parcelas em aberto" value={indicators.openInstallments} icon={Wallet} />
        <Indicator
          label="Valor a receber"
          value={indicators.formatted.amountReceivable}
          icon={CircleDollarSign}
        />
        <Indicator
          label="Valor a pagar"
          value={indicators.formatted.amountPayable}
          icon={CircleDollarSign}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">O que está acontecendo</h3>
        <p className="text-sm text-slate-500">
          Mensagens automáticas com base nos seus lançamentos. Verde = bom. Amarelo = atenção.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {insights.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                item.tone === "positive"
                  ? "border-emerald-200 bg-emerald-50/70"
                  : item.tone === "warning"
                    ? "border-amber-200 bg-amber-50/70"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              {item.tone === "positive" ? (
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              ) : item.tone === "warning" ? (
                <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 text-slate-500" />
              )}
              <p className="text-sm text-slate-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Receitas × Despesas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.revenueVsExpenses}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis hide />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="revenue" name="Receita" fill="#083EAA" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Despesa" fill="#fda4af" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fluxo mensal">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.monthlyFlow}>
              <defs>
                <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#083EAA" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#083EAA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis hide />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Area
                type="monotone"
                dataKey="flow"
                stroke="#083EAA"
                fill="url(#flowFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução da receita">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.revenueEvolution}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis hide />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#059669"
                fill="#d1fae5"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recebimentos por mês">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.receiptsByMonth}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis hide />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" name="Recebido" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Categorias financeiras">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.categories} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#083EAA" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top clientes">
          {charts.topCustomers.length === 0 ? (
            <p className="grid h-full place-items-center text-sm text-slate-500">
              Sem vendas registradas ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {charts.topCustomers.map((item) => (
                <li key={item.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
