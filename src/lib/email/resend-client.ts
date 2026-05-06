import { Resend } from "resend";

export type AbandonedCartMergeFields = {
  first_name?: string;
  email?: string;
  checkout_url?: string;
  product_name?: string;
};

/** Replace `{{first_name}}`-style tokens (case-insensitive, optional spaces). */
export function applyMergeTags(
  template: string,
  fields: Record<string, string | undefined>
): string {
  let out = template;
  for (const [key, value] of Object.entries(fields)) {
    const safe = value ?? "";
    const re = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "gi");
    out = out.replace(re, safe);
  }
  return out;
}

/** @deprecated use applyMergeTags */
export const applyAbandonedCartMergeTags = applyMergeTags;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function resolveResendFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    ""
  );
}

export async function sendResendHtmlEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ id?: string }> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const from = opts.from?.trim() || resolveResendFromAddress();
  if (!from) {
    throw new Error("Set RESEND_FROM_EMAIL or FROM_EMAIL to a Resend-verified sender");
  }

  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    throw new Error(error.message);
  }
  return { id: data?.id };
}

export type ResendAudienceOption = { id: string; name: string };

export async function listResendAudiences(): Promise<ResendAudienceOption[]> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const { data, error } = await resend.audiences.list();
  if (error) {
    throw new Error(error.message);
  }
  const rows = data?.data ?? [];
  return rows.map((a) => ({ id: a.id, name: a.name }));
}

/**
 * Add a lead to a Resend Audience. Creates the contact, or updates first name on duplicate email.
 */
export async function addContactToResendAudience(input: {
  audienceId: string;
  email: string;
  firstName: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const audienceId = input.audienceId.trim();
  if (!audienceId) {
    throw new Error("Resend audience ID is required");
  }
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim().slice(0, 80) || "Friend";

  const created = await resend.contacts.create({
    audienceId,
    email,
    firstName,
    unsubscribed: false,
  });

  if (!created.error) return;

  const errMsg = created.error.message?.toLowerCase() ?? "";
  const duplicate =
    errMsg.includes("already") ||
    errMsg.includes("duplicate") ||
    errMsg.includes("exists");

  if (!duplicate) {
    throw new Error(created.error.message);
  }

  const updated = await resend.contacts.update({
    audienceId,
    email,
    firstName,
  });
  if (updated.error) {
    throw new Error(updated.error.message);
  }
}
