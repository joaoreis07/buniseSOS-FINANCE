"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { cn } from "@/shared/components/ui/utils";
import { formatCurrency } from "@/modules/finance/utils";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, type PaymentMethod } from "@/modules/finance/types";
import { formatCivilDatePtBr, todayCivilDateKey } from "@/modules/crm/lib/civil-date";
import { buildDueDates, firstDueDateFromCivilKey } from "@/modules/crm/lib/installment-schedule";
import { computeSaleFromItems, parseNumericInput, splitAmount } from "@/modules/crm/lib/sale-totals";
import { createSaleAction } from "../actions/sales.actions";

type CustomerOption = { id: string; name: string };
type DraftItem = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
};
type Period = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";

function emptyItem(): DraftItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    quantity: "1",
    unitPrice: "",
    discountAmount: "0",
  };
}

function parseMoneyField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return parseNumericInput(trimmed, "valor");
  } catch {
    return null;
  }
}

function saleDescriptionFromItems(items: DraftItem[]): string {
  const names = items.map((item) => item.description.trim()).filter(Boolean);
  const joined = names.join(", ");
  if (joined.length >= 2) return joined.slice(0, 180);
  return "Venda";
}

export function NewSaleForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);

  const [customerId, setCustomerId] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [generalDiscount, setGeneralDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "INSTALLMENT">("CASH");
  const [cashStatus, setCashStatus] = useState<"PAID" | "PENDING">("PAID");
  const [installmentsCount, setInstallmentsCount] = useState("2");
  const [firstDueDate, setFirstDueDate] = useState(todayCivilDateKey());
  const [period, setPeriod] = useState<Period>("MONTHLY");
  const [customPeriodDays, setCustomPeriodDays] = useState("30");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCustomer = customers.find((item) => item.id === customerId) ?? null;
  const isCardCredit = paymentMethod === "CARD_CREDIT";
  const effectiveMode = isCardCredit ? "CASH" : paymentMode;

  const { totals, computeError } = useMemo(() => {
    try {
      const parsedItems = items
        .filter((item) => item.description.trim() || item.unitPrice.trim())
        .map((item, index) => ({
          description: item.description,
          quantity: item.quantity || "0",
          unitPrice: item.unitPrice || "0",
          discountAmount: item.discountAmount || "0",
          sortOrder: index,
        }));
      if (parsedItems.length === 0) return { totals: null, computeError: null };
      return { totals: computeSaleFromItems(parsedItems, generalDiscount.trim() || 0), computeError: null };
    } catch (error) {
      return {
        totals: null,
        computeError: error instanceof Error ? error.message : "Informe um valor válido",
      };
    }
  }, [items, generalDiscount]);

  const lineErrors = items.map((item) => {
    if (!item.description.trim() && !item.unitPrice.trim()) return null;
    if (!item.description.trim()) return "Informe a descrição do item";
    const quantity = parseMoneyField(item.quantity);
    if (quantity === null || quantity <= 0) return "Quantidade deve ser maior que zero";
    const unitPrice = parseMoneyField(item.unitPrice);
    if (unitPrice === null || unitPrice < 0) return "Valor unitário inválido";
    const discount = parseMoneyField(item.discountAmount) ?? 0;
    if (discount < 0) return "Desconto do item inválido";
    const subtotal = Math.round(quantity * 1000) / 1000 * unitPrice;
    if (discount > subtotal + 0.001) return "Desconto maior que o subtotal do item";
    return null;
  });

  const installmentPreview = useMemo(() => {
    if (effectiveMode !== "INSTALLMENT" || !totals || totals.totalAmount <= 0) return [];
    const count = Number(installmentsCount);
    if (!Number.isInteger(count) || count < 2) return [];
    if (!firstDueDate) return [];
    const amounts = splitAmount(totals.totalAmount, count);
    const dates = buildDueDates({
      count,
      firstDueDate: firstDueDateFromCivilKey(firstDueDate),
      period,
      customPeriodDays: customPeriodDays ? Number(customPeriodDays) : undefined,
    });
    return amounts.map((amount, index) => ({
      number: index + 1,
      amount,
      dueDate: dates[index],
    }));
  }, [effectiveMode, totals, installmentsCount, firstDueDate, period, customPeriodDays]);

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setFormError(null);
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const validate = (): string | null => {
    if (!customerId) return "Selecione o cliente";
    const filled = items.filter((item) => item.description.trim() || item.unitPrice.trim());
    if (filled.length === 0) return "Informe ao menos um item";
    const firstLineError = lineErrors.find(Boolean);
    if (firstLineError) return firstLineError;
    const general = parseMoneyField(generalDiscount) ?? 0;
    if (general < 0) return "Desconto geral inválido";
    if (!totals || totals.totalAmount <= 0) {
      return computeError ?? "Informe um valor válido";
    }
    if (general > totals.subtotal + 0.001) return "Desconto geral maior que o subtotal";
    if (!isCardCredit && paymentMode === "INSTALLMENT") {
      const count = Number(installmentsCount);
      if (!Number.isInteger(count) || count < 2) return "Informe ao menos 2 parcelas";
      if (!firstDueDate) return "Informe o primeiro vencimento";
    }
    return null;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      setFormError(error);
      toast.error(error);
      return;
    }
    if (!totals || submitting.current || pending) return;
    submitting.current = true;
    setFormError(null);

    const payloadItems = items
      .filter((item) => item.description.trim())
      .map((item, index) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount.trim() ? item.discountAmount : "0",
        sortOrder: index,
      }));

    startTransition(async () => {
      try {
        const result = await createSaleAction({
          customerId,
          description: saleDescriptionFromItems(items),
          totalAmount: String(totals.totalAmount).replace(".", ","),
          discountAmount: generalDiscount.trim() || "0",
          items: payloadItems,
          paymentMethod,
          paymentMode: isCardCredit ? "CASH" : paymentMode,
          cashStatus: isCardCredit ? "PAID" : cashStatus,
          installmentsCount,
          firstDueDate,
          period,
          customPeriodDays,
        });
        if (!result.success) {
          setFormError(result.error);
          toast.error(result.error);
          submitting.current = false;
          return;
        }
        toast.success(result.message ?? "Venda registrada");
        router.push("/app/sales");
        router.refresh();
      } catch {
        toast.error("Não foi possível registrar a venda");
        submitting.current = false;
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid min-w-0 max-w-full gap-5 overflow-x-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Nova venda</h2>
          <p className="mt-1 text-sm text-slate-500">Itens, descontos e pagamento. O total final é calculado no servidor.</p>
        </div>
        <Button asChild type="button" variant="outline" className="h-11 rounded-xl">
          <Link href="/app/sales">Voltar</Link>
        </Button>
      </div>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <Label className="text-sm font-medium text-slate-700">Cliente *</Label>
        <div className="mt-2 flex min-w-0 gap-2">
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="h-11 min-w-0 flex-1 justify-between rounded-xl font-normal"
              >
                <span className={cn("truncate", !selectedCustomer && "text-slate-400")}>
                  {selectedCustomer?.name ?? "Pesquisar cliente"}
                </span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(calc(100vw-2rem),360px)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.name}
                        onSelect={() => {
                          setCustomerId(customer.id);
                          setCustomerOpen(false);
                          setFormError(null);
                        }}
                      >
                        <Check className={cn("mr-2 size-4", customerId === customer.id ? "opacity-100" : "opacity-0")} />
                        {customer.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {customerId ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl"
              onClick={() => setCustomerId("")}
              title="Limpar cliente"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold tracking-[-0.02em]">Itens</h3>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => setItems((current) => [...current, emptyItem()])}
          >
            <Plus className="mr-2 size-4" />
            Adicionar item
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          {items.map((item, index) => {
            let lineTotalLabel = "—";
            try {
              if (item.description.trim() || item.unitPrice.trim()) {
                const computed = computeSaleFromItems([
                  {
                    description: item.description || "Item",
                    quantity: item.quantity || "0",
                    unitPrice: item.unitPrice || "0",
                    discountAmount: item.discountAmount || "0",
                  },
                ]);
                lineTotalLabel = formatCurrency(computed.items[0].lineTotal);
              }
            } catch {
              lineTotalLabel = "—";
            }
            return (
              <article key={item.key} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Item {index + 1}</p>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600"
                      onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                      aria-label="Remover item"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
                    <Label>Descrição *</Label>
                    <Input
                      value={item.description}
                      onChange={(event) => updateItem(item.key, { description: event.target.value })}
                      className="h-11 rounded-xl bg-white"
                      placeholder="Ex.: Camiseta"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Quantidade</Label>
                    <Input
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                      className="h-11 rounded-xl bg-white"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Valor unitário</Label>
                    <Input
                      value={item.unitPrice}
                      onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })}
                      className="h-11 rounded-xl bg-white"
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Desconto</Label>
                    <Input
                      value={item.discountAmount}
                      onChange={(event) => updateItem(item.key, { discountAmount: event.target.value })}
                      className="h-11 rounded-xl bg-white"
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Total da linha</Label>
                    <p className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                      {lineTotalLabel}
                    </p>
                  </div>
                </div>
                {lineErrors[index] ? (
                  <p className="mt-2 text-xs text-rose-600">{lineErrors[index]}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-semibold tracking-[-0.02em]">Resumo</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Subtotal</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(totals?.subtotal ?? 0)}</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Desconto geral</Label>
            <Input
              value={generalDiscount}
              onChange={(event) => {
                setFormError(null);
                setGeneralDiscount(event.target.value);
              }}
              className="h-11 rounded-xl"
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3">
            <p className="text-xs text-blue-700">Total</p>
            <p className="mt-1 text-lg font-semibold text-blue-800">{formatCurrency(totals?.totalAmount ?? 0)}</p>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-semibold tracking-[-0.02em]">Pagamento</h3>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCardCredit ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-slate-700">
              No cartão de crédito a venda entra como paga. O parcelamento é com o banco — não gera parcelas a receber.
            </div>
          ) : (
            <>
              <div className="grid gap-1.5">
                <Label>Condição</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("CASH")}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-medium",
                      paymentMode === "CASH"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    À vista
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("INSTALLMENT")}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-medium",
                      paymentMode === "INSTALLMENT"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    Parcelado
                  </button>
                </div>
              </div>

              {paymentMode === "CASH" ? (
                <div className="grid gap-1.5">
                  <Label>Pagamento recebido agora?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashStatus("PAID")}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-medium",
                        cashStatus === "PAID"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      Sim, pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashStatus("PENDING")}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-medium",
                        cashStatus === "PENDING"
                          ? "border-amber-600 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      Não, pendente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label>Quantidade de parcelas</Label>
                      <Input
                        type="number"
                        min={2}
                        value={installmentsCount}
                        onChange={(event) => setInstallmentsCount(event.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Primeiro vencimento</Label>
                      <Input
                        type="date"
                        value={firstDueDate}
                        onChange={(event) => setFirstDueDate(event.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Periodicidade</Label>
                    <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
                      <SelectTrigger className="h-11 w-full rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                        <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                        <SelectItem value="WEEKLY">Semanal</SelectItem>
                        <SelectItem value="CUSTOM">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {period === "CUSTOM" ? (
                    <div className="grid gap-1.5">
                      <Label>Intervalo em dias</Label>
                      <Input
                        type="number"
                        min={1}
                        value={customPeriodDays}
                        onChange={(event) => setCustomPeriodDays(event.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  ) : null}
                  {installmentPreview.length > 0 ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Prévia das parcelas
                      </p>
                      <ul className="mt-2 grid gap-1.5 text-sm text-slate-600">
                        {installmentPreview.map((row) => (
                          <li key={row.number} className="flex justify-between gap-3">
                            <span>
                              {row.number}ª · {formatCivilDatePtBr(row.dueDate)}
                            </span>
                            <span className="font-medium text-slate-900">{formatCurrency(row.amount)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-slate-400">Visual apenas. O servidor gera as parcelas finais.</p>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-semibold tracking-[-0.02em]">Confirmação</h3>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Cliente</dt>
            <dd className="min-w-0 text-right font-medium text-slate-900">
              {selectedCustomer?.name ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Itens</dt>
            <dd className="min-w-0 text-right text-slate-700">
              {items
                .filter((item) => item.description.trim())
                .map((item) => `${item.quantity} × ${item.description.trim()}`)
                .join(", ") || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Subtotal</dt>
            <dd>{formatCurrency(totals?.subtotal ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Desconto</dt>
            <dd>{formatCurrency(totals?.discountAmount ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatCurrency(totals?.totalAmount ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Pagamento</dt>
            <dd>{PAYMENT_METHOD_LABELS[paymentMethod]}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Condição</dt>
            <dd>
              {isCardCredit
                ? "À vista (crédito)"
                : paymentMode === "CASH"
                  ? cashStatus === "PAID"
                    ? "À vista paga"
                    : "À vista pendente"
                  : `${installmentsCount}x`}
            </dd>
          </div>
          {installmentPreview.length > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Parcelas</dt>
              <dd>
                {installmentPreview.length} × {formatCurrency(installmentPreview[0]?.amount ?? 0)}
              </dd>
            </div>
          ) : null}
        </dl>

        {formError ? (
          <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-base shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          {pending ? "Finalizando..." : "Finalizar venda"}
        </Button>
      </section>
    </form>
  );
}
