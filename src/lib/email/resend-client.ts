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

function stripEnvQuotes(value: string): string {
  const s = value.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1).trim();
  }
  return s;
}

/** Extract bare email from `Name <email@domain.com>` if needed. */
function extractBareEmail(value: string): string | null {
  const s = stripEnvQuotes(value);
  const angle = s.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return s;
  return null;
}

/**
 * Resend-verified sender. Prefers a full `Name <email>` from FROM_EMAIL; otherwise
 * wraps RESEND_FROM_EMAIL (bare) as `CELPIP Practice <email>`.
 */
export function resolveResendFromAddress(): string {
  const fromEmail = stripEnvQuotes(process.env.FROM_EMAIL ?? "");
  const resendEmail = stripEnvQuotes(process.env.RESEND_FROM_EMAIL ?? "");

  if (fromEmail.includes("<")) return fromEmail;
  if (resendEmail.includes("<")) return resendEmail;

  const bare =
    extractBareEmail(resendEmail) ||
    extractBareEmail(fromEmail) ||
    resendEmail ||
    fromEmail;

  if (bare) {
    return `CELPIP Practice <${bare}>`;
  }

  return "";
}

export class ResendSendError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ResendSendError";
    this.code = code;
  }
}

export async function sendResendHtmlEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ id?: string }> {
  const resend = getResendClient();
  if (!resend) {
    throw new ResendSendError("RESEND_API_KEY is not configured");
  }
  const from = opts.from?.trim() || resolveResendFromAddress();
  if (!from) {
    throw new ResendSendError(
      "Set RESEND_FROM_EMAIL or FROM_EMAIL to a Resend-verified sender"
    );
  }

  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const html = opts.html.replace(/\0/g, "");
  const subject = opts.subject.trim().slice(0, 900);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw new ResendSendError(
      error.message || "Resend rejected the email",
      error.name
    );
  }
  if (!data?.id) {
    throw new ResendSendError("Resend returned no message id");
  }
  return { id: data.id };
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
