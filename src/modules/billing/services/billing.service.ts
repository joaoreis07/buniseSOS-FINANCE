import type { Plan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import {
  PLAN_DEFINITIONS,
  buildBillingExternalReference,
  isPaidPlan,
  parseBillingExternalReference,
  type PaidPlan,
} from "../plans";
import {
  asaasCheckoutUrl,
  createAsaasSubscriptionCheckout,
} from "../lib/asaas-client";
import { buildBillingCustomerData } from "../lib/billing-customer";

export type BillingOverview = {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  planName: string;
  priceMonthly: number;
  maxCustomers: number | null;
  maxUsers: number | null;
  maxTransactions: number | null;
  customerCount: number;
  userCount: number;
  transactionCount: number;
  asaasConfigured: boolean;
};

export async function getBillingOverview(companyId: string): Promise<BillingOverview> {
  assertTenantId(companyId);
  const [company, customerCount, userCount, transactionCount] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: {
        plan: true,
        subscriptionStatus: true,
      },
    }),
    prisma.customer.count({ where: { companyId, deletedAt: null } }),
    prisma.membership.count({ where: { companyId, deletedAt: null } }),
    prisma.transaction.count({ where: { companyId, deletedAt: null } }),
  ]);

  if (!company) {
    throw new Error("Empresa não encontrada");
  }

  const definition = PLAN_DEFINITIONS[company.plan];
  return {
    plan: company.plan,
    subscriptionStatus: company.subscriptionStatus,
    planName: definition.name,
    priceMonthly: definition.priceMonthly,
    maxCustomers: definition.maxCustomers,
    maxUsers: definition.maxUsers,
    maxTransactions: definition.maxTransactions,
    customerCount,
    userCount,
    transactionCount,
    asaasConfigured: Boolean(process.env.ASAAS_API_KEY?.trim()),
  };
}

export async function assertCanCreateCustomer(companyId: string): Promise<void> {
  const overview = await getBillingOverview(companyId);
  if (overview.maxCustomers !== null && overview.customerCount >= overview.maxCustomers) {
    throw new Error(
      `Limite do plano ${overview.planName}: máximo de ${overview.maxCustomers} clientes. Faça upgrade em Configurações → Planos.`,
    );
  }
}

export async function assertCanCreateTransaction(companyId: string): Promise<void> {
  const overview = await getBillingOverview(companyId);
  if (
    overview.maxTransactions !== null &&
    overview.transactionCount >= overview.maxTransactions
  ) {
    throw new Error(
      `Limite do plano ${overview.planName}: máximo de ${overview.maxTransactions} lançamentos. Faça upgrade em Configurações → Planos.`,
    );
  }
}

export async function assertCanAddUser(companyId: string): Promise<void> {
  const overview = await getBillingOverview(companyId);
  if (overview.maxUsers !== null && overview.userCount >= overview.maxUsers) {
    throw new Error(
      `Limite do plano ${overview.planName}: máximo de ${overview.maxUsers} usuário(s). Faça upgrade para Business.`,
    );
  }
}

export async function startPlanCheckout(params: {
  companyId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  plan: PaidPlan;
  appUrl: string;
}): Promise<{ checkoutUrl: string; checkoutId: string }> {
  assertTenantId(params.companyId);

  if (!process.env.ASAAS_API_KEY?.trim()) {
    throw new Error("Pagamentos Asaas ainda não estão configurados neste ambiente");
  }

  const company = await prisma.company.findFirst({
    where: { id: params.companyId, deletedAt: null },
  });
  if (!company) {
    throw new Error("Empresa não encontrada");
  }

  const definition = PLAN_DEFINITIONS[params.plan];
  const externalReference = buildBillingExternalReference(params.companyId, params.plan);
  const base = params.appUrl.replace(/\/$/, "");
  const customer = buildBillingCustomerData({
    company,
    userName: params.userName,
    userEmail: params.userEmail,
    sandbox: process.env.ASAAS_ENV !== "production",
  });

  const checkout = await createAsaasSubscriptionCheckout({
    planName: definition.name,
    value: definition.priceMonthly,
    externalReference,
    customer,
    successUrl: `${base}/app/settings?billing=success&plan=${params.plan}`,
    cancelUrl: `${base}/app/settings?billing=cancel`,
  });

  await prisma.company.update({
    where: { id: params.companyId },
    data: {
      stripeCustomerId: company.stripeCustomerId,
      stripeSubscriptionId: checkout.id,
      subscriptionStatus: "INCOMPLETE",
    },
  });

  const checkoutUrl = checkout.link?.trim() || asaasCheckoutUrl(checkout.id);
  return { checkoutUrl, checkoutId: checkout.id };
}

export async function activatePaidPlan(params: {
  companyId: string;
  plan: PaidPlan;
  asaasSubscriptionId?: string | null;
}): Promise<void> {
  assertTenantId(params.companyId);
  await prisma.company.update({
    where: { id: params.companyId },
    data: {
      plan: params.plan,
      subscriptionStatus: "ACTIVE",
      ...(params.asaasSubscriptionId
        ? { stripeSubscriptionId: params.asaasSubscriptionId }
        : {}),
    },
  });
}

export async function downgradeToStarter(companyId: string): Promise<void> {
  assertTenantId(companyId);
  await prisma.company.update({
    where: { id: companyId },
    data: {
      plan: "STARTER",
      subscriptionStatus: "CANCELED",
    },
  });
}

export async function applyAsaasWebhookEvent(payload: {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    subscription?: string | null;
    externalReference?: string | null;
    value?: number;
  };
  subscription?: {
    id?: string;
    status?: string;
    externalReference?: string | null;
    value?: number;
  };
  checkout?: {
    id?: string;
    status?: string;
    externalReference?: string | null;
  };
}): Promise<{ handled: boolean; message: string }> {
  const event = payload.event ?? "";
  const externalReference =
    payload.payment?.externalReference ??
    payload.subscription?.externalReference ??
    payload.checkout?.externalReference ??
    null;
  const parsed = parseBillingExternalReference(externalReference);

  if (!parsed) {
    return { handled: false, message: "externalReference não reconhecida" };
  }

  const activateEvents = new Set([
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
    "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
    "CHECKOUT_PAID",
  ]);

  const pastDueEvents = new Set(["PAYMENT_OVERDUE", "PAYMENT_DELETED"]);
  const cancelEvents = new Set([
    "SUBSCRIPTION_DELETED",
    "SUBSCRIPTION_INACTIVATED",
    "CHECKOUT_CANCELED",
    "CHECKOUT_EXPIRED",
  ]);

  const paymentConfirmed =
    payload.payment?.status === "RECEIVED" || payload.payment?.status === "CONFIRMED";
  const checkoutPaid =
    (payload.checkout?.status ?? "").toUpperCase() === "PAID" || event === "CHECKOUT_PAID";

  if (activateEvents.has(event) || paymentConfirmed || checkoutPaid) {
    await activatePaidPlan({
      companyId: parsed.companyId,
      plan: parsed.plan,
      asaasSubscriptionId:
        payload.payment?.subscription ?? payload.subscription?.id ?? payload.checkout?.id,
    });
    return { handled: true, message: `Plano ${parsed.plan} ativado` };
  }

  if (pastDueEvents.has(event)) {
    await prisma.company.update({
      where: { id: parsed.companyId },
      data: { subscriptionStatus: "PAST_DUE" },
    });
    return { handled: true, message: "Assinatura marcada como PAST_DUE" };
  }

  if (cancelEvents.has(event)) {
    // Only downgrade on subscription cancel — not on a single expired checkout attempt.
    if (event === "CHECKOUT_CANCELED" || event === "CHECKOUT_EXPIRED") {
      return { handled: true, message: `Checkout ignorado: ${event}` };
    }
    await prisma.company.update({
      where: { id: parsed.companyId },
      data: {
        plan: "STARTER",
        subscriptionStatus: "CANCELED",
      },
    });
    return { handled: true, message: "Assinatura cancelada → Starter" };
  }

  // Fallback: if subscription value matches a paid plan, activate.
  const value = payload.subscription?.value ?? payload.payment?.value;
  if (value && isPaidPlan(parsed.plan)) {
    const expected = PLAN_DEFINITIONS[parsed.plan].priceMonthly;
    if (Math.abs(Number(value) - expected) < 0.01 && event.includes("PAYMENT")) {
      await activatePaidPlan({
        companyId: parsed.companyId,
        plan: parsed.plan,
        asaasSubscriptionId: payload.payment?.subscription ?? payload.subscription?.id,
      });
      return { handled: true, message: `Plano ${parsed.plan} ativado (fallback)` };
    }
  }

  return { handled: false, message: `Evento ignorado: ${event || "unknown"}` };
}
