import { getAnalyticsPricingModelContext } from "@/lib/analyticsPricingModelContext";
import { getAnalyticsStyleContext } from "@/lib/analyticsStyleContext";
import { rememberAppClientPlatform } from "@/lib/appClientPlatform";
import { setGa4UserProperties } from "@/lib/ga4Browser";

const STORAGE_KEYS = {
  testDate: "celpip_kpi_test_date",
  daysUntil: "celpip_kpi_days_until_test",
  bucket: "celpip_kpi_days_until_bucket",
  targetClb: "celpip_kpi_target_clb",
  diagnosticStarted: "celpip_kpi_diagnostic_started",
  diagnosticCompleted: "celpip_kpi_diagnostic_completed",
} as const;

/** KPI cohort buckets for Engagement by Days-Until-Test. */
export type DaysUntilTestBucket =
  | "60+"
  | "30-59"
  | "14-29"
  | "0-13"
  | "unknown";

const LABEL_TO_DAYS: Record<string, number | null> = {
  "Within 2 weeks": 10,
  "In less than 2 weeks": 10,
  "Within 1 month": 30,
  "In 1 month": 30,
  "1–3 months": 45,
  "1-3 months": 45,
  "In 2+ months": 75,
  "3–6 months": 120,
  "3-6 months": 120,
  "6+ months": 200,
  "I don't have a date yet": null,
  "I haven't booked it yet": null,
};

export function bucketDaysUntilTest(
  days: number | null | undefined,
): DaysUntilTestBucket {
  if (days == null || !Number.isFinite(days) || days < 0) return "unknown";
  if (days <= 13) return "0-13";
  if (days <= 29) return "14-29";
  if (days <= 59) return "30-59";
  return "60+";
}

export function daysUntilFromTestDateInput(
  testDate: string | null | undefined,
): number | null {
  if (!testDate?.trim()) return null;
  const trimmed = testDate.trim();
  if (trimmed in LABEL_TO_DAYS) {
    return LABEL_TO_DAYS[trimmed] ?? null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86_400_000);
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(key);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null || value === "") {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, value);
  } catch {
    // private mode / quota
  }
}

export function persistTestDateContext(testDate: string): {
  daysUntilTest: number | null;
  bucket: DaysUntilTestBucket;
} {
  const daysUntilTest = daysUntilFromTestDateInput(testDate);
  const bucket = bucketDaysUntilTest(daysUntilTest);
  writeStorage(STORAGE_KEYS.testDate, testDate);
  writeStorage(
    STORAGE_KEYS.daysUntil,
    daysUntilTest != null ? String(daysUntilTest) : null,
  );
  writeStorage(STORAGE_KEYS.bucket, bucket);
  syncKpiUserProperties();
  return { daysUntilTest, bucket };
}

export function persistTargetClb(targetClb: number | string): void {
  writeStorage(STORAGE_KEYS.targetClb, String(targetClb));
  syncKpiUserProperties();
}

export function getKpiEventContext(): {
  days_until_test?: number;
  days_until_test_bucket: DaysUntilTestBucket;
  target_clb?: string;
} {
  const storedDays = readStorage(STORAGE_KEYS.daysUntil);
  const daysUntil =
    storedDays != null && Number.isFinite(Number(storedDays))
      ? Number(storedDays)
      : daysUntilFromTestDateInput(readStorage(STORAGE_KEYS.testDate));
  const bucket =
    (readStorage(STORAGE_KEYS.bucket) as DaysUntilTestBucket | null) ||
    bucketDaysUntilTest(daysUntil);
  const targetClb = readStorage(STORAGE_KEYS.targetClb);

  return {
    ...(daysUntil != null ? { days_until_test: daysUntil } : {}),
    days_until_test_bucket: bucket,
    ...(targetClb ? { target_clb: targetClb } : {}),
  };
}

/** Push user-scoped KPI dimensions so every subsequent GA4 event is cohortable. */
export function syncKpiUserProperties(extra?: {
  userPlan?: string;
  targetClb?: string | number;
}): void {
  const kpi = getKpiEventContext();
  const style = getAnalyticsStyleContext().style;
  const pricing = getAnalyticsPricingModelContext().pricing_ab_model;
  const targetClb =
    extra?.targetClb != null ? String(extra.targetClb) : kpi.target_clb;
  if (extra?.targetClb != null) {
    writeStorage(STORAGE_KEYS.targetClb, String(extra.targetClb));
  }

  const platform = rememberAppClientPlatform();
  setGa4UserProperties({
    user_plan: extra?.userPlan,
    days_until_test_bucket: kpi.days_until_test_bucket,
    target_clb: targetClb,
    has_test_date: kpi.days_until_test_bucket === "unknown" ? "false" : "true",
    style,
    pricing_ab_model: pricing,
    platform,
    app_platform: platform,
  });
}

/** True the first time this browser starts a diagnostic (first full mock). */
export function consumeDiagnosticStart(): boolean {
  if (typeof window === "undefined") return false;
  if (readStorage(STORAGE_KEYS.diagnosticStarted)) return false;
  writeStorage(STORAGE_KEYS.diagnosticStarted, "1");
  return true;
}

/** True the first time this browser completes a diagnostic. */
export function consumeDiagnosticComplete(): boolean {
  if (typeof window === "undefined") return false;
  if (readStorage(STORAGE_KEYS.diagnosticCompleted)) return false;
  writeStorage(STORAGE_KEYS.diagnosticStarted, "1");
  writeStorage(STORAGE_KEYS.diagnosticCompleted, "1");
  return true;
}
