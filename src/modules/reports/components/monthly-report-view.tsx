"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/shared/components/empty-state";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { formatCurrency, formatDateBR } from "@/modules/finance/utils";
import { updateMonthlyGoalAction } from "@/modules/settings/actions/settings.actions";
import { getMonthlyReportAction } from "../actions/reports.actions";
import type { MonthlyReportDTO, ReportInsight } from "../dto/reports.dto";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions(selectedKey: string): Array<{ value: string; label: string }> {
  const [y, m] = selectedKey.split("-").map(Number);
  const base = new Date(y, m - 1, 1);
  return Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(date);
    return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}

function Trend({ label }: { label: string }) {
  const negative = label.startsWith("-");
  const flat = label === "—";
  return (
    <p
      className={`mt-1 text-xs font-medium ${
        negative ? "text-rose-600" : flat ? "text-slate-400" : "text-emerald-600"
      }`}
    >
      {label} <span className="font-normal text-slate-400">vs. mês anterior</span>
    </p>
  );
}

function InsightCard({ insight }: { insight: ReportInsight }) {
  const styles =
    insight.tone === "positive"
      ? "border-emerald-200 bg-emerald-50/70"
      : insight.tone === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : "border-slate-200 bg-slate-50";
  const Icon =
    insight.tone === "positive"
      ? TrendingUp
      : insight.tone === "warning"
        ? AlertTriangle
        : Lightbulb;

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 place-items-center rounded-xl bg-white/80 text-slate-700">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{insight.detail}</p>
        </div>
      </div>
    </div>
  );
}

function CategoryList({
  title,
  items,
  emptyLabel,
  accent,
}: {
  title: string;
  items: MonthlyReportDTO["topIncomeCategories"];
  emptyLabel: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.categoryId}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.categoryName}</span>
                <span className="tabular-nums text-slate-900">{item.formattedAmount}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${accent}`}
                  style={{ width: `${Math.max(4, Math.min(100, item.sharePercent))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MonthlyReportView({
  initialData,
  canEditGoal = false,
}: {
  initialData: MonthlyReportDTO;
  canEditGoal?: boolean;
}) {
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState(initialData.monthKey);
  const [pending, startTransition] = useTransition();
  const [goalDraft, setGoalDraft] = useState(String(initialData.monthlyGoal || ""));
  const [savingGoal, startSaveGoal] = useTransition();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["monthly-report", initialData.companyId, monthKey],
    queryFn: () => getMonthlyReportAction(monthKey),
    initialData: monthKey === initialData.monthKey ? initialData : undefined,
  });

  useEffect(() => {
    if (data) setGoalDraft(String(data.monthlyGoal || ""));
  }, [data]);

  const options = useMemo(() => monthOptions(monthKey), [monthKey]);

  const goToMonth = (next: string) => {
    startTransition(() => setMonthKey(next));
  };

  const saveGoal = () => {
    startSaveGoal(async () => {
      const result = await updateMonthlyGoalAction({ monthlyGoal: goalDraft });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Meta salva");
      setGoalDraft(String(result.data.monthlyGoal));
      await queryClient.invalidateQueries({
        queryKey: ["monthly-report", initialData.companyId],
      });
      void refetch();
    });
  };

  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Não foi possível carregar o acompanhamento"
        description="Tente novamente em instantes."
        actionLabel="Recarregar"
        onAction={() => {
          void refetch();
        }}
      />
    );
  }

  const chartData = data.comparison.map((item) => ({
    month: item.month,
    monthKey: item.monthKey,
    receita: item.revenue,
    despesa: item.expenses,
  }));

  const thisMonth = currentMonthKey();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Meta e acompanhamento</h2>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {data.periodLabel}
            {isFetching || pending ? " · atualizando..." : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => goToMonth(shiftMonthKey(monthKey, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <select
            className="h-11 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-300"
            value={monthKey}
            onChange={(event) => goToMonth(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => goToMonth(shiftMonthKey(monthKey, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
          {monthKey !== thisMonth && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => goToMonth(thisMonth)}
            >
              Este mês
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white">
              <Target className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Meta mensal de receita</h3>
              <p className="mt-1 text-sm text-slate-600">
                Defina o alvo e acompanhe o progresso mês a mês.
              </p>
            </div>
          </div>
          {!canEditGoal && (
            <Link href="/app/settings" className="text-sm font-semibold text-blue-600 hover:underline">
              Editar em Configurações →
            </Link>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Progresso em {data.periodLabel}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  {data.monthlyGoal > 0 ? `${Math.round(data.goalProgressPercent)}%` : "Sem meta"}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-500">Receita do mês</p>
                <p className="font-semibold text-emerald-700">{data.formattedRevenue}</p>
                <p className="mt-1 text-slate-500">Meta</p>
                <p className="font-semibold text-slate-900">{data.formattedMonthlyGoal}</p>
              </div>
            </div>
            {data.monthlyGoal > 0 ? (
              <>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.goalMet ? "bg-emerald-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.max(2, Math.min(100, data.goalProgressPercent))}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {data.goalMet
                    ? `Meta de ${data.formattedMonthlyGoal} atingida`
                    : `Faltam ${data.formattedGoalRemaining} para a meta`}
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Defina uma meta para acompanhar o ritmo do mês.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">Definir meta</h4>
            {canEditGoal ? (
              <div className="mt-3 grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="report-monthly-goal">Valor mensal (R$)</Label>
                  <Input
                    id="report-monthly-goal"
                    inputMode="decimal"
                    placeholder="Ex: 10000"
                    value={goalDraft}
                    onChange={(event) => setGoalDraft(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  disabled={savingGoal}
                  onClick={saveGoal}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  {savingGoal ? "Salvando..." : "Salvar meta"}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Meta atual:{" "}
                <span className="font-semibold text-slate-800">{data.formattedMonthlyGoal}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-sm text-slate-500">Receita</p>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-emerald-700">
            {data.formattedRevenue}
          </p>
          <Trend label={data.revenueTrendLabel} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-sm text-slate-500">Despesa</p>
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownRight className="size-4" />
            </span>
          </div>
          <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-rose-700">
            {data.formattedExpenses}
          </p>
          <Trend label={data.expensesTrendLabel} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-sm text-slate-500">Lucro</p>
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="size-4" />
            </span>
          </div>
          <p
            className={`mt-5 text-2xl font-semibold tracking-[-0.04em] ${
              data.profit >= 0 ? "text-slate-900" : "text-rose-700"
            }`}
          >
            {data.formattedProfit}
          </p>
          <Trend label={data.profitTrendLabel} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-sm text-slate-500">A receber</p>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
            {data.formattedPendingIncome}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.overdueCount > 0
              ? `${data.overdueCount} em atraso · ${data.formattedOverdueIncome}`
              : "Sem atrasos no momento"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Comparativo dos últimos meses</h3>
            <p className="text-xs text-slate-400">Receita × despesa</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={64}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "receita" ? "Receita" : "Despesa",
                  ]}
                />
                <Bar dataKey="receita" fill="#083EAA" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesa" fill="#fda4af" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Histórico mês a mês</h3>
          <p className="mt-1 text-xs text-slate-400">Clique para abrir o mês</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {data.comparison
              .slice()
              .reverse()
              .map((item) => {
                const active = item.monthKey === monthKey;
                return (
                  <li key={item.monthKey}>
                    <button
                      type="button"
                      onClick={() => goToMonth(item.monthKey)}
                      className={`flex w-full items-center justify-between gap-3 py-3 text-left transition ${
                        active ? "bg-blue-50/70 px-2 rounded-xl" : "hover:bg-slate-50 px-2 rounded-xl"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium capitalize text-slate-900">{item.month}</p>
                        <p className="text-xs text-slate-500">
                          Lucro {formatCurrency(item.profit)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-emerald-700">
                          {formatCurrency(item.revenue)}
                        </p>
                        <p className="text-xs text-rose-600">{formatCurrency(item.expenses)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">O que melhorar</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryList
          title="Top categorias — entradas"
          items={data.topIncomeCategories}
          emptyLabel="Nenhuma receita categorizada neste mês."
          accent="bg-emerald-500"
        />
        <CategoryList
          title="Top categorias — saídas"
          items={data.topExpenseCategories}
          emptyLabel="Nenhuma despesa categorizada neste mês."
          accent="bg-rose-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Pendentes e atrasados</h3>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">A receber (pendente no mês)</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{data.formattedPendingIncome}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-700/80">Em atraso (total)</p>
              <p className="mt-1 text-lg font-semibold text-amber-900">{data.formattedOverdueIncome}</p>
              <p className="mt-0.5 text-xs text-amber-700/70">{data.overdueCount} lançamento(s)</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/app/finance" className="text-sm font-semibold text-blue-600 hover:underline">
              Ir para Financeiro →
            </Link>
            <Link
              href="/app/receivables"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Ver parcelas →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Lista de pendências</h3>
          {data.overdueItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Nenhum recebível pendente ou atrasado no momento.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.overdueItems.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.customerName ?? "Sem cliente"}
                      {item.dueDate
                        ? ` · venc. ${formatDateBR(item.dueDate)}`
                        : ` · ${formatDateBR(item.date)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{item.formattedAmount}</p>
                    <span
                      className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        item.status === "OVERDUE"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.status === "OVERDUE" ? "Atrasado" : "Pendente"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
