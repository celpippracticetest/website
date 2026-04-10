import { getPayPalAccessToken } from "./accessToken";
import { paypalApiBase } from "./config";

export type PayPalSubscriptionResource = {
  id: string;
  status?: string;
  /** Current billing plan id (updates after revise/upgrade). */
  plan_id?: string;
  plan?: { id?: string };
  custom_id?: string;
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: { currency_code?: string; value?: string };
    };
  };
};

export async function paypalApiJson<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const token = await getPayPalAccessToken();
  const { idempotencyKey, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (fetchInit.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (idempotencyKey) {
    headers.set("PayPal-Request-Id", idempotencyKey);
  }

  const res = await fetch(`${paypalApiBase()}${path}`, {
    ...fetchInit,
    headers,
  });

  const text = await res.text();
  let json: T = {} as T;
  if (text) {
    try {
      json = JSON.parse(text) as T;
    } catch {
      json = {} as T;
    }
  }

  if (!res.ok) {
    const detail =
      (json as { details?: Array<{ description?: string; issue?: string }> }).details?.[0];
    const debugId = (json as { debug_id?: string }).debug_id;
    const msg =
      detail?.description ||
      detail?.issue ||
      (json as { message?: string }).message ||
      text ||
      res.statusText;
    const composed = typeof msg === "string" ? msg : "PayPal API error";
    throw new Error(debugId ? `${composed} (debug_id: ${debugId})` : composed);
  }

  return json;
}

export async function createPayPalSubscription(body: {
  plan_id: string;
  custom_id: string;
  subscriber?: { email_address?: string };
  application_context: {
    brand_name: string;
    locale: string;
    shipping_preference: "NO_SHIPPING";
    user_action: "SUBSCRIBE_NOW";
    return_url: string;
    cancel_url: string;
  };
}): Promise<{ id: string; links?: Array<{ href: string; rel: string }> }> {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  return paypalApiJson("/v1/billing/subscriptions", {
    method: "POST",
    idempotencyKey,
    body: JSON.stringify(body),
  });
}

export async function getPayPalSubscription(
  subscriptionId: string
): Promise<PayPalSubscriptionResource> {
  const enc = encodeURIComponent(subscriptionId);
  return paypalApiJson<PayPalSubscriptionResource>(`/v1/billing/subscriptions/${enc}`, {
    method: "GET",
  });
}
