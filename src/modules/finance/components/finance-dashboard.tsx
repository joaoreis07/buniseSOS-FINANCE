"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Plus,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/components/ui/utils";
import { PAYMENT_METHODS, TEAM, TODAY, initialMovements } from "../data";
import type {
  DateFilter,
  FinanceMovement,
  MovementFormData,
  MovementType,
  PaymentMethod,
} from "../types";
import {
  formatCurrency,
  formatDateBR,
  formatLongDate,
  isInFilterRange,
  nowTime,
} from "../utils";
import { PaymentBadge } from "./payment-badge";

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "semana", label: "Esta Semana" },
  { id: "mes", label: "Este Mês" },
  { id: "personalizado", label: "Período Personalizado" },
];

const emptyForm = (): MovementFormData => ({
  type: "entrada",
  personName: "",
  description: "",
  amount: "",
  paymentMethod: "PIX",
  responsible: "",
  date: TODAY,
  time: nowTime(),
  notes: "",
});

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
  icon: typeof Wallet;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl transition group-hover:scale-105",
            accent,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </motion.div>
  );
}

function TypeBadge({ type }: { type: MovementType }) {
  const isEntry = type === "entrada";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
        isEntry
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {isEntry ? (
        <ArrowDownLeft className="size-3" />
      ) : (
        <ArrowUpRight className="size-3" />
      )}
      {isEntry ? "Entrada" : "Saída"}
    </span>
  );
}

export function FinanceDashboard() {
  const [movements, setMovements] =
    useState<FinanceMovement[]>(initialMovements);
  const [filter, setFilter] = useState<DateFilter>("hoje");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | MovementType>("todos");
  const [methodFilter, setMethodFilter] = useState<"todos" | PaymentMethod>(
    "todos",
  );
  const [responsibleFilter, setResponsibleFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MovementFormData>(emptyForm);

  const todayMovements = useMemo(
    () => movements.filter((m) => m.date === TODAY),
    [movements],
  );

  const entradasHoje = useMemo(
    () =>
      todayMovements
        .filter((m) => m.type === "entrada")
        .reduce((sum, m) => sum + m.amount, 0),
    [todayMovements],
  );

  const saidasHoje = useMemo(
    () =>
      todayMovements
        .filter((m) => m.type === "saida")
        .reduce((sum, m) => sum + m.amount, 0),
    [todayMovements],
  );

  const saldoAtual = useMemo(() => {
    const totalIn = movements
      .filter((m) => m.type === "entrada")
      .reduce((sum, m) => sum + m.amount, 0);
    const totalOut = movements
      .filter((m) => m.type === "saida")
      .reduce((sum, m) => sum + m.amount, 0);
    return totalIn - totalOut;
  }, [movements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements
      .filter((m) => isInFilterRange(m.date, filter, customFrom, customTo))
      .filter((m) => (typeFilter === "todos" ? true : m.type === typeFilter))
      .filter((m) =>
        methodFilter === "todos" ? true : m.paymentMethod === methodFilter,
      )
      .filter((m) =>
        responsibleFilter === "todos"
          ? true
          : m.responsible === responsibleFilter,
      )
      .filter((m) => {
        if (!q) return true;
        return (
          m.personName.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.responsible.toLowerCase().includes(q) ||
          m.paymentMethod.toLowerCase().includes(q) ||
          (m.notes?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        const da = `${a.date}T${a.time}`;
        const db = `${b.date}T${b.time}`;
        return db.localeCompare(da);
      });
  }, [
    movements,
    filter,
    customFrom,
    customTo,
    typeFilter,
    methodFilter,
    responsibleFilter,
    search,
  ]);

  const summaryEntries = useMemo(
    () => filtered.filter((m) => m.type === "entrada"),
    [filtered],
  );
  const summaryExits = useMemo(
    () => filtered.filter((m) => m.type === "saida"),
    [filtered],
  );
  const totalEntradas = summaryEntries.reduce((s, m) => s + m.amount, 0);
  const totalSaidas = summaryExits.reduce((s, m) => s + m.amount, 0);
  const saldoFiltrado = totalEntradas - totalSaidas;
  const lastMovement = filtered[0];

  function openModal() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function saveMovement() {
    const amount = Number(
      form.amount.replace(",", ".").replace(/[^\d.]/g, ""),
    );
    if (
      !form.personName.trim() ||
      !form.description.trim() ||
      !form.responsible ||
      !form.date ||
      !form.time ||
      !amount ||
      amount <= 0
    ) {
      return;
    }

    const next: FinanceMovement = {
      id: `m-${Date.now()}`,
      type: form.type,
      personName: form.personName.trim(),
      description: form.description.trim(),
      paymentMethod: form.paymentMethod,
      responsible: form.responsible,
      amount,
      date: form.date,
      time: form.time,
      notes: form.notes.trim() || undefined,
    };

    setMovements((prev) => [next, ...prev]);
    setModalOpen(false);
    setForm(emptyForm());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-900">
            Financeiro
          </h2>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {formatLongDate(TODAY)} · Controle de caixa da clínica
          </p>
        </div>
        <Button
          type="button"
          onClick={openModal}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Nova Movimentação
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Entradas do Dia"
          value={formatCurrency(entradasHoje)}
          hint={`${todayMovements.filter((m) => m.type === "entrada").length} recebimentos`}
          icon={ArrowDownLeft}
          accent="bg-emerald-50 text-emerald-600"
          delay={0}
        />
        <StatCard
          label="Saídas do Dia"
          value={formatCurrency(saidasHoje)}
          hint={`${todayMovements.filter((m) => m.type === "saida").length} pagamentos`}
          icon={ArrowUpRight}
          accent="bg-rose-50 text-rose-600"
          delay={0.05}
        />
        <StatCard
          label="Saldo Atual"
          value={formatCurrency(saldoAtual)}
          hint="Entradas − saídas (período total)"
          icon={TrendingUp}
          accent="bg-blue-50 text-blue-600"
          delay={0.1}
        />
        <StatCard
          label="Movimentações do Dia"
          value={String(todayMovements.length)}
          hint="Registros de hoje"
          icon={CalendarDays}
          accent="bg-amber-50 text-amber-600"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {DATE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-semibold transition",
                      filter === f.id
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filter === "personalizado" ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-slate-500">De</Label>
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="h-9 w-[160px] rounded-xl"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-slate-500">Até</Label>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="h-9 w-[160px] rounded-xl"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, descrição, responsável…"
                    className="h-10 rounded-xl pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={typeFilter}
                    onValueChange={(v) =>
                      setTypeFilter(v as "todos" | MovementType)
                    }
                  >
                    <SelectTrigger className="h-10 w-[140px] rounded-xl">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={methodFilter}
                    onValueChange={(v) =>
                      setMethodFilter(v as "todos" | PaymentMethod)
                    }
                  >
                    <SelectTrigger className="h-10 w-[180px] rounded-xl">
                      <SelectValue placeholder="Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as formas</SelectItem>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={responsibleFilter}
                    onValueChange={setResponsibleFilter}
                  >
                    <SelectTrigger className="h-10 w-[160px] rounded-xl">
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {TEAM.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {[
                      "Data",
                      "Horário",
                      "Tipo",
                      "Nome",
                      "Descrição",
                      "Pagamento",
                      "Valor",
                      "Responsável",
                      "Observação",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-16 text-center text-sm text-slate-400"
                      >
                        Nenhuma movimentação encontrada para os filtros
                        selecionados.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-slate-50 transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          {formatDateBR(m.date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                          {m.time}
                        </td>
                        <td className="px-4 py-3.5">
                          <TypeBadge type={m.type} />
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-900">
                          {m.personName}
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3.5 text-slate-600">
                          {m.description}
                        </td>
                        <td className="px-4 py-3.5">
                          <PaymentBadge method={m.paymentMethod} />
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums",
                            m.type === "entrada"
                              ? "text-emerald-600"
                              : "text-rose-600",
                          )}
                        >
                          {m.type === "entrada" ? "+" : "−"}
                          {formatCurrency(m.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          {m.responsible}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-3.5 text-slate-400">
                          {m.notes || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Resumo</h3>
              <p className="text-xs text-slate-400">Período filtrado</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Entradas</span>
              <span className="text-sm font-semibold text-slate-900">
                {summaryEntries.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total de Entradas</span>
              <span className="text-sm font-semibold text-emerald-600">
                {formatCurrency(totalEntradas)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total de Saídas</span>
              <span className="text-sm font-semibold text-rose-600">
                {formatCurrency(totalSaidas)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Saldo Atual
                </span>
                <span
                  className={cn(
                    "text-base font-semibold tracking-[-0.02em]",
                    saldoFiltrado >= 0 ? "text-blue-600" : "text-rose-600",
                  )}
                >
                  {formatCurrency(saldoFiltrado)}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Última movimentação
              </p>
              {lastMovement ? (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <TypeBadge type={lastMovement.type} />
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        lastMovement.type === "entrada"
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      {formatCurrency(lastMovement.amount)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-slate-800">
                    {lastMovement.personName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateBR(lastMovement.date)} · {lastMovement.time}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Sem registros</p>
              )}
            </div>
          </div>
        </motion.aside>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>
              Registre uma entrada ou saída no caixa da clínica.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <RadioGroup
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as MovementType }))
                }
                className="grid grid-cols-2 gap-2"
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition",
                    form.type === "entrada"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <RadioGroupItem value="entrada" id="tipo-entrada" />
                  Entrada
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition",
                    form.type === "saida"
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <RadioGroupItem value="saida" id="tipo-saida" />
                  Saída
                </label>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="personName">Nome da pessoa</Label>
              <Input
                id="personName"
                value={form.personName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, personName: e.target.value }))
                }
                placeholder={
                  form.type === "entrada"
                    ? "Paciente ou pagador"
                    : "Fornecedor ou beneficiário"
                }
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Ex.: Consulta, materiais, conta…"
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0,00"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>Forma de pagamento</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      paymentMethod: v as PaymentMethod,
                    }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select
                value={form.responsible || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, responsible: v }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Quem registrou" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Horário</Label>
                <Input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, time: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Opcional"
                className="min-h-[80px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
              onClick={saveMovement}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
