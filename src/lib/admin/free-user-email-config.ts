export const SIGNUP_PERIOD_OPTIONS = ["last_3_days", "last_7_days", "last_30_days"] as const;
export type SignupPeriod = (typeof SIGNUP_PERIOD_OPTIONS)[number];

export const SIGNUP_PERIOD_LABELS: Record<SignupPeriod, string> = {
  last_3_days: "Last 3 days",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
};

export function parseSignupPeriod(raw: string | null | undefined): SignupPeriod | null {
  const v = (raw ?? "").trim();
  return (SIGNUP_PERIOD_OPTIONS as readonly string[]).includes(v) ? (v as SignupPeriod) : null;
}

const PERIOD_DAYS: Record<SignupPeriod, number> = {
  last_3_days: 3,
  last_7_days: 7,
  last_30_days: 30,
};

export function signupPeriodStart(period: SignupPeriod, now = new Date()): Date {
  const days = PERIOD_DAYS[period];
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Max recipients returned for preview lists (full count still reported). */
export const FREE_USER_EMAIL_PREVIEW_LIMIT = 25;

/** Hard cap per bulk send to protect Resend quota and request timeouts. */
export const FREE_USER_EMAIL_SEND_LIMIT = 500;
