"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { updateCompanyProfileAction } from "@/modules/settings/actions/settings.actions";
import type { CompanyProfileClientDTO } from "@/modules/settings/dto/settings.dto";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { isValidCpfCnpj } from "../lib/billing-customer";
import { startCheckoutAction } from "../actions/billing.actions";
import {
  PLAN_DEFINITIONS,
  formatPlanPrice,
  type PaidPlan,
} from "../plans";
import type { BillingOverview } from "../services/billing.service";

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Em teste",
  ACTIVE: "Ativo",
  PAST_DUE: "Pagamento atrasado",
  CANCELED: "Cancelado",
  INCOMPLETE: "Pagamento pendente",
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function splitStreetAndNumber(addressRaw: string): { street: string; number: string } {
  const address = addressRaw.trim();
  if (!address) return { street: "", number: "" };
  const match =
    address.match(/,\s*n[ºo°.]?\s*(\d+[A-Za-z/-]?)\s*$/i) ||
    address.match(/,\s*(\d+[A-Za-z/-]?)\s*$/) ||
    address.match(/\s+(\d+[A-Za-z/-]?)\s*$/);
  if (!match?.[1] || match.index === undefined) {
    return { street: address, number: "" };
  }
  return {
    street: address.slice(0, match.index).replace(/[,\s]+$/, "").trim(),
    number: match[1],
  };
}

type BillingFormState = {
  cnpj: string;
  phone: string;
  street: string;
  number: string;
  zipCode: string;
  city: string;
  state: string;
};

function toBillingForm(company: CompanyProfileClientDTO): BillingFormState {
  const split = splitStreetAndNumber(company.address ?? "");
  return {
    cnpj: company.cnpj ?? "",
    phone: company.phone ?? "",
    street: split.street,
    number: split.number,
    zipCode: company.zipCode ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
  };
}

function missingBillingFields(form: BillingFormState): string[] {
  const missing: string[] = [];
  if (!isValidCpfCnpj(form.cnpj)) missing.push("CNPJ/CPF válido");
  if (onlyDigits(form.phone).length < 10) missing.push("telefone");
  if (!form.street.trim()) missing.push("endereço");
  if (!form.number.trim()) missing.push("número");
  if (onlyDigits(form.zipCode).length !== 8) missing.push("CEP");
  if (!form.city.trim()) missing.push("bairro/cidade");
  if (form.state.trim().length !== 2) missing.push("UF");
  return missing;
}

export function PlansPanel({
  initialBilling,
  company,
  canManage,
}: {
  initialBilling: BillingOverview;
  company: CompanyProfileClientDTO;
  canManage: boolean;
}) {
  const [billing] = useState(initialBilling);
  const [form, setForm] = useState<BillingFormState>(() => toBillingForm(company));
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null);
  const [pending, startTransition] = useTransition();

  const missing = useMemo(() => missingBillingFields(form), [form]);
  const billingReady = missing.length === 0;

  const plans = [
    PLAN_DEFINITIONS.STARTER,
    PLAN_DEFINITIONS.PROFESSIONAL,
    PLAN_DEFINITIONS.BUSINESS,
  ];

  const saveBillingProfile = async (): Promise<boolean> => {
    const gaps = missingBillingFields(form);
    if (gaps.length > 0) {
      toast.error(`Preencha: ${gaps.join(", ")}`);
      return false;
    }

    const result = await updateCompanyProfileAction({
      name: company.name,
      cnpj: onlyDigits(form.cnpj),
      phone: onlyDigits(form.phone),
      address: `${form.street.trim()}, ${form.number.trim()}`,
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      zipCode: onlyDigits(form.zipCode),
    });

    if (!result.success) {
      toast.error(result.error);
      return false;
    }

    toast.success("Dados de cobrança salvos");
    return true;
  };

  const subscribe = (plan: PaidPlan) => {
    if (!billing.asaasConfigured) {
      toast.error("Asaas ainda não está configurado neste ambiente.");
      return;
    }
    setPendingPlan(plan);
    startTransition(async () => {
      const saved = await saveBillingProfile();
      if (!saved) {
        setPendingPlan(null);
        return;
      }

      const result = await startCheckoutAction(plan);
      if (!result.success) {
        toast.error(result.error);
        setPendingPlan(null);
        return;
      }
      toast.success("Abrindo checkout Asaas...");
      window.location.href = result.data.checkoutUrl;
    });
  };

  const setField = (key: keyof BillingFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CreditCard className="size-4 text-blue-600" />
            <h3 className="font-semibold">Planos e assinatura</h3>
          </div>
          <p className="text-sm text-slate-500">
            Plano atual:{" "}
            <span className="font-semibold text-slate-800">{billing.planName}</span>
            {" · "}
            {STATUS_LABEL[billing.subscriptionStatus] ?? billing.subscriptionStatus}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Clientes: {billing.customerCount}
            {billing.maxCustomers !== null ? ` / ${billing.maxCustomers}` : " (ilimitado)"}
            {" · "}
            Lançamentos: {billing.transactionCount}
            {billing.maxTransactions !== null
              ? ` / ${billing.maxTransactions}`
              : " (ilimitado)"}
            {" · "}
            Usuários: {billing.userCount}
            {billing.maxUsers !== null ? ` / ${billing.maxUsers}` : " (ilimitado)"}
          </p>
        </div>
        {!billing.asaasConfigured && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Asaas não configurado
          </span>
        )}
      </div>

      {canManage && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm font-semibold text-slate-900">Dados para cobrança (obrigatório)</p>
          <p className="mt-1 text-xs text-slate-600">
            O Asaas exige esses dados antes de abrir o pagamento. Salve e depois clique em Assinar.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bill-cnpj">CNPJ ou CPF</Label>
              <Input
                id="bill-cnpj"
                placeholder="00.000.000/0001-00"
                value={form.cnpj}
                onChange={(e) => setField("cnpj", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bill-phone">Telefone</Label>
              <Input
                id="bill-phone"
                placeholder="11999999999"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="bill-street">Endereço (rua)</Label>
              <Input
                id="bill-street"
                placeholder="Rua Exemplo"
                value={form.street}
                onChange={(e) => setField("street", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bill-number">Número</Label>
              <Input
                id="bill-number"
                placeholder="100"
                value={form.number}
                onChange={(e) => setField("number", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bill-zip">CEP</Label>
              <Input
                id="bill-zip"
                placeholder="01310100"
                value={form.zipCode}
                onChange={(e) => setField("zipCode", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bill-city">Bairro / Cidade</Label>
              <Input
                id="bill-city"
                placeholder="Centro"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bill-state">UF</Label>
              <Input
                id="bill-state"
                placeholder="SP"
                maxLength={2}
                value={form.state}
                onChange={(e) => setField("state", e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await saveBillingProfile();
                });
              }}
            >
              Salvar dados
            </Button>
            <p className={`text-xs ${billingReady ? "text-emerald-700" : "text-amber-700"}`}>
              {billingReady
                ? "Pronto para assinar"
                : `Faltando: ${missing.join(", ")}`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = billing.plan === plan.id;
          const isPaid = plan.id === "PROFESSIONAL" || plan.id === "BUSINESS";
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 ${
                plan.highlighted
                  ? "border-blue-300 bg-blue-50/40 shadow-sm"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{plan.name}</p>
                {plan.highlighted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    <Sparkles className="size-3" /> Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                {formatPlanPrice(plan.priceMonthly)}
                <span className="text-sm font-normal text-slate-400">/mês</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button disabled className="w-full rounded-xl" variant="outline">
                    Plano atual
                  </Button>
                ) : isPaid && canManage ? (
                  <Button
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700"
                    disabled={pending}
                    onClick={() => subscribe(plan.id as PaidPlan)}
                  >
                    {pending && pendingPlan === plan.id
                      ? "Abrindo Asaas..."
                      : `Assinar ${plan.name}`}
                  </Button>
                ) : (
                  <Button disabled className="w-full rounded-xl" variant="outline">
                    {plan.priceMonthly === 0 ? "Incluso no cadastro" : "Indisponível"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-400">
        Assinatura mensal via Asaas com cartão de crédito (pagamento real).
        Valores: Profissional R$ 49/mês · Business R$ 99/mês. Após o pagamento, o plano é
        confirmado pelo Asaas (webhook ou retorno verificado).
      </p>
    </section>
  );
}
