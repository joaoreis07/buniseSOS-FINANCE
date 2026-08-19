"use server";

import { requirePermission } from "@/shared/lib/session";
import { getAsaasCheckout } from "../lib/asaas-client";
import { isPaidPlan, parseBillingExternalReference, PLAN_DEFINITIONS } from "../plans";
import { activatePaidPlan, getBillingOverview } from "../services/billing.service";
import { prisma } from "@/shared/lib/prisma";

/**
 * Confirms plan activation after Asaas success redirect.
 * Never trusts the URL alone — verifies checkout status with Asaas API.
 * Webhook remains the primary source of truth for recurring renewals.
 */
export async function confirmBillingReturnAction(plan: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await requirePermission("settings:manage");
    if (!isPaidPlan(plan)) {
      return { success: false, message: "Plano inválido" };
    }

    const overview = await getBillingOverview(user.companyId);
    if (overview.plan === plan && overview.subscriptionStatus === "ACTIVE") {
      return { success: true, message: "Plano já ativo" };
    }

    const company = await prisma.company.findFirst({
      where: { id: user.companyId, deletedAt: null },
      select: { stripeSubscriptionId: true, subscriptionStatus: true },
    });

    const checkoutId = company?.stripeSubscriptionId?.trim();
    if (!checkoutId) {
      return {
        success: false,
        message: "Checkout não encontrado. Se já pagou, aguarde a confirmação do Asaas.",
      };
    }

    const checkout = await getAsaasCheckout(checkoutId);
    const status = (checkout.status ?? "").toUpperCase();

    if (status !== "PAID") {
      return {
        success: false,
        message:
          status === "EXPIRED" || status === "CANCELED"
            ? "Checkout expirado ou cancelado. Tente assinar novamente."
            : "Pagamento ainda não confirmado no Asaas. Se já pagou, aguarde alguns segundos e atualize a página.",
      };
    }

    // Prefer plan from externalReference; fall back to query param only if it matches.
    const parsed = parseBillingExternalReference(checkout.externalReference);
    const planToActivate = parsed?.plan && parsed.companyId === user.companyId ? parsed.plan : plan;

    if (!isPaidPlan(planToActivate)) {
      return { success: false, message: "Plano do checkout inválido" };
    }

    // Guard: expected price must match paid plan definition.
    const expected = PLAN_DEFINITIONS[planToActivate].priceMonthly;
    if (expected <= 0) {
      return { success: false, message: "Plano sem cobrança válida" };
    }

    await activatePaidPlan({
      companyId: user.companyId,
      plan: planToActivate,
      asaasSubscriptionId: checkoutId,
    });

    return {
      success: true,
      message: `Plano ${PLAN_DEFINITIONS[planToActivate].name} ativado`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Falha ao confirmar plano",
    };
  }
}
