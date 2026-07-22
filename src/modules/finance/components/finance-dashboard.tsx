"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Plus,
  Search,
  Tags,
  Trash2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/components/ui/utils";
import type {
  CategoryClientDTO,
  FinanceCustomerOption,
  FinanceOverviewDTO,
  TransactionClientDTO,
} from "../dto/finance.dto";
import {
  createCategoryAction,
  createTransactionAction,
  deleteCategoryAction,
  deleteTransactionAction,
} from "../actions/finance.actions";
import {
  createCategorySchema,
  transactionFormSchema,
  type CreateCategoryInput,
  type TransactionFormInput,
} from "../schemas/finance.schemas";
import type { DateFilter, PaymentMethod, TransactionStatus } from "../types";
import { PAYMENT_METHOD_LABELS, STATUS_LABELS } from "../types";
import {
  formatCurrency,
  formatDateBR,
  formatLongDate,
  isInFilterRange,
  toDateInputValue,
} from "../utils";
import { PaymentBadge } from "./payment-badge";

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "semana", label: "Esta Semana" },
  { id: "mes", label: "Este Mês" },
  { id: "personalizado", label: "Período Personalizado" },
];

const TODAY = new Date().toISOString().slice(0, 10);

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

function TypeBadge({ type }: { type: TransactionClientDTO["type"] }) {
  const isEntry = type === "INCOME";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
        isEntry
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {isEntry ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
      {isEntry ? "Entrada" : "Saída"}
    </span>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
        status === "PAID" && "bg-emerald-50 text-emerald-700",
        status === "PENDING" && "bg-amber-50 text-amber-700",
        status === "OVERDUE" && "bg-rose-50 text-rose-700",
        status === "CANCELED" && "bg-slate-100 text-slate-500",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function FinanceDashboard({
  initialData,
  customers,
  canManage,
}: {
  initialData: FinanceOverviewDTO;
  customers: FinanceCustomerOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialData.transactions);
  const [categories, setCategories] = useState(initialData.categories);
  const [cashFlow, setCashFlow] = useState(initialData.cashFlow);
  const [todayIncome, setTodayIncome] = useState(initialData.todayIncome);
  const [todayExpense, setTodayExpense] = useState(initialData.todayExpense);
  const [todayCount, setTodayCount] = useState(initialData.todayCount);

  const [filter, setFilter] = useState<DateFilter>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | "INCOME" | "EXPENSE">("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | TransactionStatus>("todos");
  const [methodFilter, setMethodFilter] = useState<"todos" | PaymentMethod>("todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "INCOME",
      status: "PAID",
      paymentMethod: "PIX",
      amount: "",
      description: "",
      notes: "",
      date: TODAY,
      categoryId: "",
      customerId: "",
    },
  });

  const categoryForm = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", type: "INCOME" },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((item) =>
        isInFilterRange(item.date, filter, customFrom, customTo, TODAY),
      )
      .filter((item) => (typeFilter === "todos" ? true : item.type === typeFilter))
      .filter((item) => (statusFilter === "todos" ? true : item.status === statusFilter))
      .filter((item) =>
        methodFilter === "todos" ? true : item.paymentMethod === methodFilter,
      )
      .filter((item) => {
        if (!q) return true;
        return (
          (item.customerName?.toLowerCase().includes(q) ?? false) ||
          (item.description?.toLowerCase().includes(q) ?? false) ||
          (item.categoryName?.toLowerCase().includes(q) ?? false) ||
          (item.notes?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filter, customFrom, customTo, typeFilter, statusFilter, methodFilter, search]);

  const periodIncome = filtered
    .filter((item) => item.type === "INCOME" && item.status === "PAID")
    .reduce((sum, item) => sum + item.amount, 0);
  const periodExpense = filtered
    .filter((item) => item.type === "EXPENSE" && item.status === "PAID")
    .reduce((sum, item) => sum + item.amount, 0);
  const periodBalance = periodIncome - periodExpense;
  const lastMovement = filtered[0];

  const selectedType = form.watch("type");
  const categoriesForType = categories.filter((item) => item.type === selectedType);

  const refreshLocalTotals = (next: TransactionClientDTO[]) => {
    const todayRows = next.filter((item) => toDateInputValue(item.date) === TODAY);
    setTodayIncome(
      todayRows
        .filter((item) => item.type === "INCOME" && item.status === "PAID")
        .reduce((sum, item) => sum + item.amount, 0),
    );
    setTodayExpense(
      todayRows
        .filter((item) => item.type === "EXPENSE" && item.status === "PAID")
        .reduce((sum, item) => sum + item.amount, 0),
    );
    setTodayCount(todayRows.length);

    let incomePaid = 0;
    let expensePaid = 0;
    let pendingIncome = 0;
    let overdueIncome = 0;
    for (const item of next) {
      if (item.type === "INCOME" && item.status === "PAID") incomePaid += item.amount;
      if (item.type === "EXPENSE" && item.status === "PAID") expensePaid += item.amount;
      if (item.type === "INCOME" && item.status === "PENDING") pendingIncome += item.amount;
      if (item.type === "INCOME" && item.status === "OVERDUE") overdueIncome += item.amount;
    }
    setCashFlow({
      incomePaid,
      expensePaid,
      balance: incomePaid - expensePaid,
      pendingIncome,
      overdueIncome,
      transactionCount: next.length,
    });
  };

  const openModal = () => {
    form.reset({
      type: "INCOME",
      status: "PAID",
      paymentMethod: "PIX",
      amount: "",
      description: "",
      notes: "",
      date: TODAY,
      categoryId: "",
      customerId: "",
    });
    setModalOpen(true);
  };

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createTransactionAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const next = [result.data, ...transactions];
      setTransactions(next);
      refreshLocalTotals(next);
      toast.success(result.message ?? "Movimentação criada");
      setModalOpen(false);
      router.refresh();
    });
  });

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteTransactionAction({ id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const next = transactions.filter((item) => item.id !== id);
      setTransactions(next);
      refreshLocalTotals(next);
      toast.success("Movimentação removida");
      router.refresh();
    });
  };

  const onCreateCategory = categoryForm.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createCategoryAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCategories((current) =>
        [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast.success("Categoria criada");
      categoryForm.reset({ name: "", type: "INCOME" });
    });
  });

  const handleDeleteCategory = (id: string) => {
    startTransition(async () => {
      const result = await deleteCategoryAction({ id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCategories((current) => current.filter((item) => item.id !== id));
      toast.success("Categoria removida");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-900">
            Financeiro
          </h2>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {formatLongDate(TODAY)} · Controle de caixa
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoriesOpen(true)}
              className="rounded-xl"
            >
              <Tags className="mr-2 size-4" />
              Categorias
            </Button>
          )}
          {canManage && (
            <Button
              type="button"
              onClick={openModal}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Plus className="size-4" />
              Nova Movimentação
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Entradas do Dia"
          value={formatCurrency(todayIncome)}
          hint="Receitas pagas hoje"
          icon={ArrowDownLeft}
          accent="bg-emerald-50 text-emerald-600"
          delay={0}
        />
        <StatCard
          label="Saídas do Dia"
          value={formatCurrency(todayExpense)}
          hint="Despesas pagas hoje"
          icon={ArrowUpRight}
          accent="bg-rose-50 text-rose-600"
          delay={0.05}
        />
        <StatCard
          label="Saldo Atual"
          value={formatCurrency(cashFlow.balance)}
          hint="Receitas pagas − despesas pagas"
          icon={TrendingUp}
          accent="bg-blue-50 text-blue-600"
          delay={0.1}
        />
        <StatCard
          label="Movimentações do Dia"
          value={String(todayCount)}
          hint={`${formatCurrency(cashFlow.pendingIncome + cashFlow.overdueIncome)} a receber`}
          icon={CalendarDays}
          accent="bg-amber-50 text-amber-600"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {DATE_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-semibold transition",
                      filter === item.id
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {item.label}
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

              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar descrição, cliente, categoria..."
                    className="h-10 rounded-xl pl-10"
                  />
                </div>
                <Select
                  value={typeFilter}
                  onValueChange={(value: "todos" | "INCOME" | "EXPENSE") => setTypeFilter(value)}
                >
                  <SelectTrigger className="h-10 w-[140px] rounded-xl">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="INCOME">Entradas</SelectItem>
                    <SelectItem value="EXPENSE">Saídas</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value: "todos" | TransactionStatus) => setStatusFilter(value)}
                >
                  <SelectTrigger className="h-10 w-[140px] rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Status</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="OVERDUE">Vencido</SelectItem>
                    <SelectItem value="CANCELED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={methodFilter}
                  onValueChange={(value: "todos" | PaymentMethod) => setMethodFilter(value)}
                >
                  <SelectTrigger className="h-10 w-[150px] rounded-xl">
                    <SelectValue placeholder="Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Pagamento</SelectItem>
                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Nenhuma movimentação"
              description="Ajuste os filtros ou registre a primeira movimentação."
              actionLabel={canManage ? "Nova Movimentação" : undefined}
              onAction={canManage ? openModal : undefined}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Pagamento</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Valor</th>
                      {canManage && <th className="px-4 py-3 font-medium" />}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3 text-slate-600">{formatDateBR(item.date)}</td>
                        <td className="px-4 py-3">
                          <TypeBadge type={item.type} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {item.customerName ?? "—"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.categoryName ?? "Sem categoria"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.description ?? "—"}
                          {item.notes ? (
                            <p className="mt-0.5 text-xs text-slate-400">{item.notes}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentBadge method={item.paymentMethod} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-semibold",
                            item.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600",
                          )}
                        >
                          {item.type === "EXPENSE" ? "-" : "+"}
                          {item.formattedAmount}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => handleDelete(item.id)}
                              disabled={pending}
                              aria-label="Remover"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold tracking-[-0.02em]">Resumo do período</h3>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Entradas</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(periodIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Saídas</span>
                <span className="font-semibold text-rose-600">
                  {formatCurrency(periodExpense)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-slate-500">Saldo</span>
                <span className="font-semibold">{formatCurrency(periodBalance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registros</span>
                <span className="font-semibold">{filtered.length}</span>
              </div>
            </div>
            {lastMovement ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Última: {lastMovement.description ?? "Movimentação"} ·{" "}
                {formatDateBR(lastMovement.date)}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold tracking-[-0.02em]">Fluxo geral</h3>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Recebido</span>
                <span className="font-medium">{formatCurrency(cashFlow.incomePaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pago</span>
                <span className="font-medium">{formatCurrency(cashFlow.expensePaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pendente</span>
                <span className="font-medium">{formatCurrency(cashFlow.pendingIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vencido</span>
                <span className="font-medium text-rose-600">
                  {formatCurrency(cashFlow.overdueIncome)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>
              Registre uma receita ou despesa com status e categoria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(value: "INCOME" | "EXPENSE") => {
                    form.setValue("type", value);
                    form.setValue("categoryId", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Entrada</SelectItem>
                    <SelectItem value="EXPENSE">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value: TransactionStatus) => form.setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="OVERDUE">Vencido</SelectItem>
                    <SelectItem value="CANCELED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input id="amount" placeholder="0,00" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-600">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input id="description" {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input type="date" {...form.register("date")} />
              </div>
              <div className="grid gap-2">
                <Label>Pagamento</Label>
                <Select
                  value={form.watch("paymentMethod") || "PIX"}
                  onValueChange={(value: PaymentMethod) =>
                    form.setValue("paymentMethod", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select
                  value={form.watch("categoryId") || "__none__"}
                  onValueChange={(value) =>
                    form.setValue("categoryId", value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categoriesForType.map((category: CategoryClientDTO) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Select
                  value={form.watch("customerId") || "__none__"}
                  onValueChange={(value) =>
                    form.setValue("customerId", value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem cliente</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={2} {...form.register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Categorias</DialogTitle>
            <DialogDescription>
              Organize receitas e despesas por categoria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateCategory} className="grid gap-3">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input {...categoryForm.register("name")} />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={categoryForm.watch("type")}
                onValueChange={(value: "INCOME" | "EXPENSE") =>
                  categoryForm.setValue("type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              Adicionar categoria
            </Button>
          </form>
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-slate-400">
                    {category.type === "INCOME" ? "Receita" : "Despesa"}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => handleDeleteCategory(category.id)}
                  disabled={pending}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
