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
 * Resend-verified sender. When set, RESEND_FROM_EMAIL wins over FROM_EMAIL
 * (FROM_EMAIL is often an SMTP/affiliate address that is not verified in Resend).
 */
export function resolveResendFromAddress(): string {
  const fromEmail = stripEnvQuotes(process.env.FROM_EMAIL ?? "");
  const resendEmail = stripEnvQuotes(process.env.RESEND_FROM_EMAIL ?? "");

  if (resendEmail) {
    if (resendEmail.includes("<")) return resendEmail;
    const bare = extractBareEmail(resendEmail) || resendEmail;
    return `CELPIP Practice <${bare}>`;
  }

  if (fromEmail.includes("<")) return fromEmail;

  const bare = extractBareEmail(fromEmail) || fromEmail;
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

export class ResendApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, opts?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "ResendApiError";
    this.statusCode = opts?.statusCode ?? 500;
    this.code = opts?.code;
  }
}

function throwIfResendError(
  error: { message: string; name?: string; statusCode?: number } | null | undefined
): void {
  if (!error) return;
  throw new ResendApiError(error.message, {
    statusCode: error.statusCode ?? 500,
    code: error.name,
  });
}

export type ResendEmailTag = { name: string; value: string };

export async function sendResendHtmlEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  tags?: ResendEmailTag[];
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
    tags: opts.tags,
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
  throwIfResendError(error);
  const rows = data?.data ?? [];
  return rows.map((a) => ({ id: a.id, name: a.name }));
}

/**
 * Add a lead to a Resend Audience. Creates the contact, or updates first name on duplicate email.
 */
export async function createResendAudience(name: string): Promise<{ id: string; name: string }> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const trimmed = name.trim().slice(0, 120);
  if (!trimmed) {
    throw new Error("Audience name is required");
  }
  const { data, error } = await resend.audiences.create({ name: trimmed });
  throwIfResendError(error);
  if (!data?.id) {
    throw new ResendApiError("Resend could not create the audience");
  }
  return { id: data.id, name: data.name };
}

export type ResendAudienceSyncResult = {
  audienceId: string;
  audienceName: string;
  attempted: number;
  added: number;
  failed: number;
  capped: boolean;
  cap: number;
  errors: string[];
};

export async function syncRecipientsToResendAudience(input: {
  audienceId: string;
  audienceName?: string;
  recipients: { email: string; firstName: string }[];
  cap?: number;
  delayMs?: number;
}): Promise<ResendAudienceSyncResult> {
  const cap = input.cap ?? 2000;
  const delayMs = input.delayMs ?? 150;
  const audienceId = input.audienceId.trim();
  if (!audienceId) {
    throw new Error("Resend audience ID is required");
  }

  const unique: { email: string; firstName: string }[] = [];
  const seen = new Set<string>();
  for (const r of input.recipients) {
    const email = r.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    unique.push({
      email,
      firstName: r.firstName.trim().slice(0, 80) || email.split("@")[0] || "Friend",
    });
  }

  const batch = unique.slice(0, cap);
  let added = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of batch) {
    try {
      await addContactToResendAudience({
        audienceId,
        email: recipient.email,
        firstName: recipient.firstName,
      });
      added += 1;
    } catch (error) {
      failed += 1;
      const msg = error instanceof Error ? error.message : "sync failed";
      errors.push(`${recipient.email}: ${msg}`);
      if (errors.length >= 10) continue;
    }
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    audienceId,
    audienceName: input.audienceName?.trim() || audienceId,
    attempted: batch.length,
    added,
    failed,
    capped: unique.length > cap,
    cap,
    errors: errors.slice(0, 10),
  };
}

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
