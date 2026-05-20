import { z } from "zod";
import { nurtureCta, nurtureEmailHtml } from "@/lib/nurture-email/templates";

export const NURTURE_EMAIL_CONFIG_COLLECTION = "nurtureEmailConfigs";
export const NURTURE_EMAIL_CONFIG_KEY = "default";

/** Only non-subscribers (plan !== plus) receive nurture emails. */
export const NURTURE_AUDIENCE = "non_subscriber_only" as const;

/**
 * Conversion-focused triggers (remarketing free users toward Plus).
 * - signup: from account creation
 * - free_user_active: after first practice while still on free plan
 * - inactive_free: practiced before, no visit in 72+ hours
 */
export const NURTURE_TRIGGER_TYPES = [
  "signup",
  "free_user_active",
  "inactive_free",
] as const;
export type NurtureTriggerType = (typeof NURTURE_TRIGGER_TYPES)[number];

/** @deprecated legacy CMS value — coerced to signup on read */
export const LEGACY_TRIGGER_TYPES = ["premium_user"] as const;

export const TIME_UNITS = ["minutes", "hours", "days", "weeks"] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export type NurtureEmailStage = {
  id: string;
  label: string;
  triggerType: NurtureTriggerType;
  delayAmount: number;
  delayUnit: TimeUnit;
  subject: string;
  htmlBody: string;
  enabled: boolean;
  sortOrder: number;
};

export type NurtureEmailConfigInput = {
  audience: typeof NURTURE_AUDIENCE;
  stages: NurtureEmailStage[];
};

export const NurtureEmailStageSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  triggerType: z.enum(NURTURE_TRIGGER_TYPES),
  delayAmount: z.number().int().min(1).max(10000),
  delayUnit: z.enum(TIME_UNITS),
  subject: z.string().trim().min(1).max(200),
  htmlBody: z.string().trim().min(1).max(500_000),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const NurtureEmailConfigWriteSchema = z.object({
  audience: z.literal(NURTURE_AUDIENCE).optional(),
  stages: z.array(NurtureEmailStageSchema).min(0).max(50),
});

const p = nurtureEmailHtml;
const cta = nurtureCta;

export const NURTURE_EMAIL_DEFAULT_STAGES: NurtureEmailStage[] = [
  {
    id: "signup_welcome_2h",
    label: "Signup — 2h welcome",
    triggerType: "signup",
    delayAmount: 2,
    delayUnit: "hours",
    subject: "Welcome {{first_name}} — your first CELPIP win takes 10 minutes",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>Thanks for joining CELPIP Practice Test. The fastest way to feel ready is one short task today — listening or reading is a great start.</p>
      ${cta("{{listening_url}}", "Start a free listening task")}
      <p style="font-size:14px;color:#52525b;">No pressure. Small sessions add up before test day.</p>`
    ),
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "signup_day1_checklist",
    label: "Signup — Day 1 checklist",
    triggerType: "signup",
    delayAmount: 1,
    delayUnit: "days",
    subject: "A simple CELPIP prep checklist for this week",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>Most successful candidates rotate four skills across the week:</p>
      <ul style="padding-left:20px;">
        <li>One listening or reading set (accuracy)</li>
        <li>One speaking or writing response (fluency)</li>
        <li>One timed mock section (stamina)</li>
        <li>Review mistakes the same day</li>
      </ul>
      ${cta("{{practice_url}}", "Open your practice hub")}
      <p style="font-size:14px;color:#52525b;">You can do all of this on the free plan — Plus adds full mock exams and deeper feedback when you are ready.</p>`
    ),
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "signup_day3_plus_value",
    label: "Signup — Day 3 Plus value",
    triggerType: "signup",
    delayAmount: 3,
    delayUnit: "days",
    subject: "What Plus unlocks (and when it is worth it)",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>Free practice is enough to build habits. <strong>Plus</strong> is for the stretch before your real test:</p>
      <ul style="padding-left:20px;">
        <li>Full mock exams that mirror CELPIP timing</li>
        <li>Unlimited practice across skills</li>
        <li>Detailed feedback to fix recurring mistakes</li>
      </ul>
      ${cta("{{pricing_url}}", "See plans and pricing")}
      <p style="font-size:14px;color:#52525b;">Reply to this email if you are unsure which plan fits your timeline.</p>`
    ),
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "signup_day7_social_proof",
    label: "Signup — Day 7 social proof",
    triggerType: "signup",
    delayAmount: 7,
    delayUnit: "days",
    subject: "Practice now so you only take the CELPIP once",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>Thousands of learners use our platform to build confidence before test day. The biggest jump usually comes after a full mock — you see timing, stamina, and score patterns in one sitting.</p>
      ${cta("{{pricing_url}}", "Unlock mock exams with Plus")}
      <p style="font-size:14px;color:#52525b;">Still exploring for free? <a href="{{practice_url}}" style="color:#2563eb;">Keep practicing here</a>.</p>`
    ),
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "signup_day14_final",
    label: "Signup — Day 14 final nudge",
    triggerType: "signup",
    delayAmount: 14,
    delayUnit: "days",
    subject: "{{first_name}}, still preparing for CELPIP?",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>If you have a test date coming up, a structured mock week often beats random drills. If you are still in exploration mode, that is fine too — your progress is saved when you return.</p>
      ${cta("{{pricing_url}}", "View Plus plans")}
      <p>Questions about billing or features? Hit reply — we read every message.</p>`
    ),
    enabled: true,
    sortOrder: 4,
  },
  {
    id: "active_day1_momentum",
    label: "Active free — Day 1 momentum",
    triggerType: "free_user_active",
    delayAmount: 1,
    delayUnit: "days",
    subject: "Nice work {{first_name}} — keep the momentum going",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>You have already started practicing — that puts you ahead of most signups. The next step that moves scores is <strong>timed</strong> work: mock sections show where you lose points under pressure.</p>
      ${cta("{{pricing_url}}", "See Plus mock exams")}
      ${cta("{{practice_url}}", "Continue free practice")}`
    ),
    enabled: true,
    sortOrder: 5,
  },
  {
    id: "active_day5_mock_pitch",
    label: "Active free — Day 5 mock pitch",
    triggerType: "free_user_active",
    delayAmount: 5,
    delayUnit: "days",
    subject: "Your scores improve faster with mock-exam feedback",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>Free tasks build skill. Full mocks reveal <em>exam</em> skill: pacing, fatigue, and repeated error types. Plus is built for that final phase — especially 2–4 weeks before your test.</p>
      ${cta("{{pricing_url}}", "Upgrade to Plus")}
      <p style="font-size:14px;color:#52525b;">Not ready yet? Keep your streak on the free plan: <a href="{{practice_url}}" style="color:#2563eb;">practice hub</a>.</p>`
    ),
    enabled: true,
    sortOrder: 6,
  },
  {
    id: "inactive_day3_winback",
    label: "Inactive free — Day 3 win-back",
    triggerType: "inactive_free",
    delayAmount: 3,
    delayUnit: "days",
    subject: "We saved your progress — pick up where you left off",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>It has been a few days since your last session. One 15-minute task today is enough to get back on track before test day creeps closer.</p>
      ${cta("{{listening_url}}", "Do a quick listening task")}
      <p style="font-size:14px;color:#52525b;">When you are ready for mocks and unlimited practice, <a href="{{pricing_url}}" style="color:#2563eb;">Plus is here</a>.</p>`
    ),
    enabled: true,
    sortOrder: 7,
  },
  {
    id: "inactive_day10_closer",
    label: "Inactive free — Day 10 closer",
    triggerType: "inactive_free",
    delayAmount: 10,
    delayUnit: "days",
    subject: "Come back when you are ready — your CELPIP prep waits",
    htmlBody: p(
      `<p>Hi {{first_name}},</p>
      <p>Life gets busy. Whenever you reopen the app, your history is waiting. If your test date is firm, consider Plus for mock exams and structured feedback in the final stretch.</p>
      ${cta("{{practice_url}}", "Return to practice")}
      ${cta("{{pricing_url}}", "Compare plans")}`
    ),
    enabled: true,
    sortOrder: 8,
  },
];

export const NURTURE_EMAIL_DEFAULT_CONFIG: NurtureEmailConfigInput = {
  audience: NURTURE_AUDIENCE,
  stages: NURTURE_EMAIL_DEFAULT_STAGES,
};

type LegacyStage = Partial<NurtureEmailStage> & {
  bodyHtml?: string;
  triggerType?: string;
};

function coerceTriggerType(raw: unknown, fallback: NurtureTriggerType): NurtureTriggerType {
  if (typeof raw === "string" && NURTURE_TRIGGER_TYPES.includes(raw as NurtureTriggerType)) {
    return raw as NurtureTriggerType;
  }
  if (raw === "premium_user") return "signup";
  return fallback;
}

function coerceStage(raw: unknown, index: number): NurtureEmailStage {
  const r = raw as LegacyStage;
  const fallback =
    NURTURE_EMAIL_DEFAULT_STAGES.find((d) => d.id === r.id) ||
    NURTURE_EMAIL_DEFAULT_STAGES[index] ||
    NURTURE_EMAIL_DEFAULT_STAGES[0];

  const htmlBody =
    (typeof r.htmlBody === "string" && r.htmlBody.trim().length > 0
      ? r.htmlBody
      : typeof r.bodyHtml === "string" && r.bodyHtml.trim().length > 0
        ? r.bodyHtml
        : fallback.htmlBody) ?? fallback.htmlBody;

  return {
    id: typeof r.id === "string" && r.id.trim() ? r.id.trim() : fallback.id,
    label: typeof r.label === "string" && r.label.trim() ? r.label.trim() : fallback.label,
    triggerType: coerceTriggerType(r.triggerType, fallback.triggerType),
    delayAmount:
      typeof r.delayAmount === "number" && r.delayAmount >= 1 ? r.delayAmount : fallback.delayAmount,
    delayUnit: TIME_UNITS.includes(r.delayUnit as TimeUnit)
      ? (r.delayUnit as TimeUnit)
      : fallback.delayUnit,
    subject:
      typeof r.subject === "string" && r.subject.trim().length > 0
        ? r.subject.trim()
        : fallback.subject,
    htmlBody,
    enabled: typeof r.enabled === "boolean" ? r.enabled : fallback.enabled,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : index,
  };
}

export function buildNurtureEmailConfigWithDefaults(
  raw?: Partial<NurtureEmailConfigInput> | null
): NurtureEmailConfigInput {
  if (!raw || !Array.isArray(raw.stages) || raw.stages.length === 0) {
    return NURTURE_EMAIL_DEFAULT_CONFIG;
  }

  const coerced = raw.stages.map((s, i) => coerceStage(s, i));
  const sortedStages = [...coerced].sort((a, b) => a.sortOrder - b.sortOrder);
  sortedStages.forEach((stage, idx) => {
    stage.sortOrder = idx;
  });

  return {
    audience: NURTURE_AUDIENCE,
    stages: sortedStages,
  };
}

/** @deprecated use NURTURE_TRIGGER_TYPES */
export const TRIGGER_TYPES = NURTURE_TRIGGER_TYPES;
/** @deprecated use NurtureTriggerType */
export type TriggerType = NurtureTriggerType;
