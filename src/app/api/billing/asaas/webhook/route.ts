import { NextResponse } from "next/server";
import { applyAsaasWebhookEvent } from "@/modules/billing/services/billing.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!configuredToken) {
    console.error("[asaas-webhook] ASAAS_WEBHOOK_TOKEN is required");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const headerToken =
    request.headers.get("asaas-access-token") ??
    request.headers.get("access_token") ??
    "";
  if (headerToken !== configuredToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await applyAsaasWebhookEvent(
      payload as Parameters<typeof applyAsaasWebhookEvent>[0],
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[asaas-webhook]", error);
    const message =
      process.env.NODE_ENV === "production"
        ? "Webhook failed"
        : error instanceof Error
          ? error.message
          : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
