import { paypalApiBase } from "./config";

let cache: { token: string; expiresAtMs: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cache && now < cache.expiresAtMs - 60_000) {
    return cache.token;
  }

  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new Error("PayPal client credentials are not configured");
  }

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const rawText = await res.text();
  let body: {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } = {};
  if (rawText) {
    try {
      body = JSON.parse(rawText) as typeof body;
    } catch {
      /* non-JSON error page */
    }
  }

  if (!res.ok || !body.access_token) {
    const paypalMsg = [body.error, body.error_description].filter(Boolean).join(": ");
    const suffix = paypalMsg
      ? ` (${paypalMsg})`
      : rawText && rawText.length < 500
        ? ` (${res.status} ${rawText})`
        : ` (${res.status} ${res.statusText})`;
    throw new Error(`PayPal OAuth token request failed${suffix}`);
  }

  const expiresInSec =
    typeof body.expires_in === "number" && body.expires_in > 0 ? body.expires_in : 300;
  cache = {
    token: body.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return cache.token;
}
