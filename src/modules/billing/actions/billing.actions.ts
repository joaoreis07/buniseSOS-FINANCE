"use server";

import { requirePermission } from "@/shared/lib/session";
import { isPaidPlan, type PaidPlan } from "../plans";
import {
  getBillingOverview,
  startPlanCheckout,
  type BillingOverview,
} from "../services/billing.service";

export type BillingActionResult<T = undefined> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

function appUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function getBillingOverviewAction(): Promise<
  BillingActionResult<BillingOverview>
> {
  try {
    const user = await requirePermission("settings:view");
    const data = await getBillingOverview(user.companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar o plano",
    };
  }
}

export async function startCheckoutAction(
  plan: string,
): Promise<BillingActionResult<{ checkoutUrl: string }>> {
  try {
    const user = await requirePermission("settings:manage");
    if (!isPaidPlan(plan)) {
      return { success: false, error: "Plano inválido para checkout" };
    }

    const result = await startPlanCheckout({
      companyId: user.companyId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      plan: plan as PaidPlan,
      appUrl: appUrl(),
    });

    return {
      success: true,
      data: { checkoutUrl: result.checkoutUrl },
      message: "Redirecionando para o Asaas...",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível iniciar o pagamento",
    };
  }
}
