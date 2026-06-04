import { Webhook } from "svix";

export type ResendWebhookEvent = {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    tags?: Record<string, string>;
    to?: string[];
    subject?: string;
  };
};

export function verifyResendWebhook(
  payload: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  }
): ResendWebhookEvent {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  }
  if (!headers.id || !headers.timestamp || !headers.signature) {
    throw new Error("Missing Svix webhook headers");
  }

  const wh = new Webhook(secret);
  return wh.verify(payload, {
    "svix-id": headers.id,
    "svix-timestamp": headers.timestamp,
    "svix-signature": headers.signature,
  }) as ResendWebhookEvent;
}
