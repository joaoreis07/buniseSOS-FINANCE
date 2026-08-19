type AsaasEnv = "sandbox" | "production";

function asaasEnv(): AsaasEnv {
  return process.env.ASAAS_ENV === "production" ? "production" : "sandbox";
}

export function asaasBaseUrl(): string {
  return asaasEnv() === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

export function asaasCheckoutUrl(checkoutId: string): string {
  const host =
    asaasEnv() === "production" ? "https://asaas.com" : "https://sandbox.asaas.com";
  return `${host}/checkoutSession/show?id=${encodeURIComponent(checkoutId)}`;
}

function apiKey(): string {
  const key = process.env.ASAAS_API_KEY?.trim();
  if (!key) {
    throw new Error("ASAAS_API_KEY não configurada");
  }
  return key;
}

export async function asaasRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "User-Agent": "BusinessOS-Finance/0.1",
      access_token: apiKey(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | T
    | { errors?: Array<{ description?: string }> }
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "errors" in body && Array.isArray(body.errors)
        ? body.errors.map((item) => item.description).filter(Boolean).join("; ")
        : `Asaas HTTP ${response.status}`;
    throw new Error(message || `Asaas HTTP ${response.status}`);
  }

  return body as T;
}

export type AsaasCheckoutResponse = {
  id: string;
  link?: string | null;
  status?: string;
  externalReference?: string | null;
};

function truncateAsaasName(value: string, max = 30): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim();
}

export async function getAsaasCheckout(checkoutId: string): Promise<AsaasCheckoutResponse> {
  return asaasRequest<AsaasCheckoutResponse>(`/checkouts/${encodeURIComponent(checkoutId)}`);
}

export async function createAsaasSubscriptionCheckout(input: {
  planName: string;
  value: number;
  externalReference: string;
  customer: {
    name: string;
    email: string;
    cpfCnpj: string;
    phoneNumber: string;
    address: string;
    addressNumber: string;
    postalCode: string;
    province: string;
    city?: string;
  };
  successUrl: string;
  cancelUrl: string;
}): Promise<AsaasCheckoutResponse> {
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 1);
  const nextDue = nextDueDate.toISOString().slice(0, 10);

  // Asaas checkout item.name max length is 30 characters.
  const itemName = truncateAsaasName(`Plano ${input.planName}`, 30);

  // Asaas rules:
  // - RECURRENT subscriptions only accept CREDIT_CARD
  // - PIX requires DETACHED (one-time) and a Pix key on the account
  const payload: Record<string, unknown> = {
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["RECURRENT"],
    minutesToExpire: 60,
    externalReference: input.externalReference,
    callback: {
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      expiredUrl: input.cancelUrl,
      autoRedirect: true,
    },
    items: [
      {
        name: itemName,
        description: `Assinatura mensal BusinessOS Finance — ${input.planName}`,
        quantity: 1,
        value: input.value,
        externalReference: input.externalReference,
      },
    ],
    subscription: {
      cycle: "MONTHLY",
      nextDueDate: nextDue,
    },
    customerData: {
      // Customer name limit is higher than item.name; keep readable.
      name: truncateAsaasName(input.customer.name, 100),
      email: input.customer.email,
      cpfCnpj: input.customer.cpfCnpj,
      phone: input.customer.phoneNumber,
      phoneNumber: input.customer.phoneNumber,
      mobilePhone: input.customer.phoneNumber,
      address: input.customer.address,
      addressNumber: input.customer.addressNumber,
      postalCode: input.customer.postalCode,
      province: input.customer.province,
      ...(input.customer.city ? { cityName: input.customer.city } : {}),
    },
  };

  return asaasRequest<AsaasCheckoutResponse>("/checkouts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
