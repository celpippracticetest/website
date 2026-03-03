import { z } from "zod";

export const REMINDER_EMAIL_CONFIG_COLLECTION = "reminderEmailConfigs";
export const REMINDER_EMAIL_CONFIG_KEY = "default";

export const REMINDER_STAGE_KEYS = [
  "signup_welcome_20m_no_activity",
  "signup_day1_no_activity",
  "signup_day3_no_activity",
  "signup_day7_final_nudge_no_activity",
  "inactive_day1",
  "inactive_day7",
] as const;

export type ReminderStageKey = (typeof REMINDER_STAGE_KEYS)[number];

export type ReminderEmailStyleConfig = {
  logoUrl: string;
  brandLabel: string;
  pageBackgroundColor: string;
  cardBackgroundColor: string;
  cardBorderColor: string;
  headerGradientFrom: string;
  headerGradientTo: string;
  headingColor: string;
  bodyTextColor: string;
  subcopyTextColor: string;
  mutedTextColor: string;
  bulletTextColor: string;
  buttonBackgroundColor: string;
  buttonTextColor: string;
};

export type ReminderEmailStageContent = {
  subjectA: string;
  subjectB: string;
  title: string;
  bodyHtml: string;
  ctaHref: string;
  ctaLabel: string;
};

export type ReminderEmailConfigInput = {
  style: ReminderEmailStyleConfig;
  stages: Record<ReminderStageKey, ReminderEmailStageContent>;
};

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #0DAA94");

export const ReminderEmailStyleSchema = z.object({
  logoUrl: z.string().trim().url().max(500),
  brandLabel: z.string().trim().min(1).max(80),
  pageBackgroundColor: hexColorSchema,
  cardBackgroundColor: hexColorSchema,
  cardBorderColor: hexColorSchema,
  headerGradientFrom: hexColorSchema,
  headerGradientTo: hexColorSchema,
  headingColor: hexColorSchema,
  bodyTextColor: hexColorSchema,
  subcopyTextColor: hexColorSchema,
  mutedTextColor: hexColorSchema,
  bulletTextColor: hexColorSchema,
  buttonBackgroundColor: hexColorSchema,
  buttonTextColor: hexColorSchema,
});

export const ReminderEmailStageContentSchema = z.object({
  subjectA: z.string().trim().min(1).max(180),
  subjectB: z.string().trim().min(1).max(180),
  title: z.string().trim().min(1).max(180),
  bodyHtml: z.string().trim().min(1).max(5000),
  ctaHref: z.string().trim().url().max(500),
  ctaLabel: z.string().trim().min(1).max(80),
});

export const ReminderEmailConfigWriteSchema = z.object({
  style: ReminderEmailStyleSchema,
  stages: z.object({
    signup_welcome_20m_no_activity: ReminderEmailStageContentSchema,
    signup_day1_no_activity: ReminderEmailStageContentSchema,
    signup_day3_no_activity: ReminderEmailStageContentSchema,
    signup_day7_final_nudge_no_activity: ReminderEmailStageContentSchema,
    inactive_day1: ReminderEmailStageContentSchema,
    inactive_day7: ReminderEmailStageContentSchema,
  }),
});

export const REMINDER_EMAIL_DEFAULT_STYLE: ReminderEmailStyleConfig = {
  logoUrl: "https://celpippracticetest.com/images/logo.png",
  brandLabel: "CELPIP Practice Test",
  pageBackgroundColor: "#FFF7ED",
  cardBackgroundColor: "#FFFFFF",
  cardBorderColor: "#FED7AA",
  headerGradientFrom: "#F97316",
  headerGradientTo: "#EA580C",
  headingColor: "#7C2D12",
  bodyTextColor: "#9A3412",
  subcopyTextColor: "#C2410C",
  mutedTextColor: "#C2410C",
  bulletTextColor: "#9A3412",
  buttonBackgroundColor: "#F97316",
  buttonTextColor: "#FFFFFF",
};

export const REMINDER_EMAIL_DEFAULT_STAGES: Record<ReminderStageKey, ReminderEmailStageContent> = {
  signup_welcome_20m_no_activity: {
    subjectA: "Welcome to CELPIP prep: start your first session",
    subjectB: "Your personalized CELPIP study space is ready",
    ctaHref: "https://celpippracticetest.com/exam-overview",
    ctaLabel: "Start First Session",
    title: "Hi {{name}}, let us start your CELPIP momentum",
    bodyHtml: `
      <p style="margin: 0 0 12px; font-size: 16px;">You are one short session away from real progress. Open your dashboard and complete a focused practice task today.</p>
      <p style="margin: 0 0 16px; font-size: 14px;">Most learners improve faster when they begin with short, consistent sessions in week one.</p>
      <ul style="margin: 0 0 16px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Quick start flow built for first-time users</li>
        <li style="margin-bottom: 8px;">Practice by skill: Listening, Reading, Writing, Speaking</li>
        <li style="margin-bottom: 8px;">Track progress and keep momentum from day one</li>
      </ul>
      <p style="margin: 0; font-size: 12px;">Start small today, then grow your streak naturally.</p>
    `.trim(),
  },
  signup_day1_no_activity: {
    subjectA: "Your CELPIP study plan is waiting for you",
    subjectB: "A 10-minute session today can build momentum",
    ctaHref: "https://celpippracticetest.com/exam-overview",
    ctaLabel: "Begin 10-Minute Practice",
    title: "{{name}}, ready to begin your first focused practice?",
    bodyHtml: `
      <p style="margin: 0 0 12px; font-size: 16px;">Consistency beats intensity. A short practice block now can establish the study habit that drives score improvement.</p>
      <p style="margin: 0 0 16px; font-size: 14px;">Use today to complete one skill section and create a stable weekly rhythm before test pressure grows.</p>
      <ul style="margin: 0 0 16px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Follow structured tasks without overwhelm</li>
        <li style="margin-bottom: 8px;">Build confidence with measurable progress</li>
        <li style="margin-bottom: 8px;">Study smarter with focused session design</li>
      </ul>
      <p style="margin: 0; font-size: 12px;">One focused session today is better than waiting for a perfect schedule.</p>
    `.trim(),
  },
  signup_day3_no_activity: {
    subjectA: "Still have not started? Let us fix that in one session",
    subjectB: "Your CELPIP score goal needs a small restart",
    ctaHref: "https://celpippracticetest.com/exam-overview",
    ctaLabel: "Restart Study Now",
    title: "{{name}}, your CELPIP goal is still fully achievable",
    bodyHtml: `
      <p style="margin: 0 0 12px; font-size: 16px;">You have not lost momentum permanently. One return session today can reset your routine and confidence quickly.</p>
      <p style="margin: 0 0 16px; font-size: 14px;">Learners who restart within the first week usually regain pace faster than those who wait longer.</p>
      <ul style="margin: 0 0 16px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Clear next step when you feel stuck</li>
        <li style="margin-bottom: 8px;">Low-friction re-entry into your study plan</li>
        <li style="margin-bottom: 8px;">Designed to rebuild consistency quickly</li>
      </ul>
      <p style="margin: 0; font-size: 12px;">Progress compounds once you return to regular practice.</p>
    `.trim(),
  },
  signup_day7_final_nudge_no_activity: {
    subjectA: "Final week-one nudge to restart CELPIP prep",
    subjectB: "Your study tools are ready whenever you are",
    ctaHref: "https://celpippracticetest.com/exam-overview",
    ctaLabel: "Return to Study Plan",
    title: "{{name}}, this is your week-one reset opportunity",
    bodyHtml: `
      <p style="margin: 0 0 12px; font-size: 16px;">Your account, progress tools, and practice structure are all ready. Come back now and move toward your target score with a fresh start.</p>
      <p style="margin: 0 0 16px; font-size: 14px;">A restart this week helps you avoid a longer break and keeps your exam preparation timeline realistic.</p>
      <ul style="margin: 0 0 16px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">No setup needed, your dashboard is ready</li>
        <li style="margin-bottom: 8px;">Resume with a guided first task</li>
        <li style="margin-bottom: 8px;">Rebuild confidence with immediate action</li>
      </ul>
      <p style="margin: 0; font-size: 12px;">Return today and make this week count.</p>
    `.trim(),
  },
  inactive_day1: {
    subjectA: "Resume your CELPIP plan before momentum drops",
    subjectB: "Your study routine needs a quick refresh",
    ctaHref: "https://celpippracticetest.com/exam-overview",
    ctaLabel: "Resume Practice",
    title: "Hi {{name}}, let us keep your progress moving",
    bodyHtml: `
      <p style="margin: 0 0 12px; font-size: 16px;">A short session today protects what you already learned and keeps your preparation pace strong.</p>
      <p style="margin: 0 0 16px; font-size: 14px;">Even one focused review after a break helps reduce forgetting and rebuilds confidence fast.</p>
      <ul style="margin: 0 0 16px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Re-enter with one guided session</li>
        <li style="margin-bottom: 8px;">Keep your practice momentum alive</li>
        <li style="margin-bottom: 8px;">Stay aligned with your target test timeline</li>
      </ul>
      <p style="margin: 0; font-size: 12px;">Short, consistent study blocks produce better retention.</p>
    `.trim(),
  },
  inactive_day7: {
    subjectA: "One week away? Time to restart your CELPIP rhythm",
    subjectB: "Protect your score goals with a quick comeback session",
    ctaHref: "https://celpippracticetest.com/exam-overview",
    ctaLabel: "Restart My Routine",
    title: "{{name}}, your progress is worth protecting",
    bodyHtml: `
      <p style="margin: 0 0 12px; font-size: 16px;">After a week off, returning now is the best way to preserve your previous effort and continue improving without losing time.</p>
      <p style="margin: 0 0 16px; font-size: 14px;">You can get back on track quickly with one focused session and continue your study plan from where you paused.</p>
      <ul style="margin: 0 0 16px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Fast comeback path with clear next step</li>
        <li style="margin-bottom: 8px;">Minimize learning loss after inactivity</li>
        <li style="margin-bottom: 8px;">Rebuild confidence with immediate progress</li>
      </ul>
      <p style="margin: 0; font-size: 12px;">A comeback session today protects weeks of effort.</p>
    `.trim(),
  },
};

export const REMINDER_EMAIL_DEFAULT_CONFIG: ReminderEmailConfigInput = {
  style: REMINDER_EMAIL_DEFAULT_STYLE,
  stages: REMINDER_EMAIL_DEFAULT_STAGES,
};

export function buildReminderEmailConfigWithDefaults(
  raw?: Partial<ReminderEmailConfigInput> | null
): ReminderEmailConfigInput {
  const incomingStyle = raw?.style || ({} as Partial<ReminderEmailStyleConfig>);
  const style: ReminderEmailStyleConfig = {
    logoUrl:
      typeof incomingStyle.logoUrl === "string" && incomingStyle.logoUrl.trim().length > 0
        ? incomingStyle.logoUrl
        : REMINDER_EMAIL_DEFAULT_STYLE.logoUrl,
    brandLabel:
      typeof incomingStyle.brandLabel === "string" && incomingStyle.brandLabel.trim().length > 0
        ? incomingStyle.brandLabel
        : REMINDER_EMAIL_DEFAULT_STYLE.brandLabel,
    pageBackgroundColor:
      typeof incomingStyle.pageBackgroundColor === "string" &&
      incomingStyle.pageBackgroundColor.trim().length > 0
        ? incomingStyle.pageBackgroundColor
        : REMINDER_EMAIL_DEFAULT_STYLE.pageBackgroundColor,
    cardBackgroundColor:
      typeof incomingStyle.cardBackgroundColor === "string" &&
      incomingStyle.cardBackgroundColor.trim().length > 0
        ? incomingStyle.cardBackgroundColor
        : REMINDER_EMAIL_DEFAULT_STYLE.cardBackgroundColor,
    cardBorderColor:
      typeof incomingStyle.cardBorderColor === "string" && incomingStyle.cardBorderColor.trim().length > 0
        ? incomingStyle.cardBorderColor
        : REMINDER_EMAIL_DEFAULT_STYLE.cardBorderColor,
    headerGradientFrom:
      typeof incomingStyle.headerGradientFrom === "string" &&
      incomingStyle.headerGradientFrom.trim().length > 0
        ? incomingStyle.headerGradientFrom
        : REMINDER_EMAIL_DEFAULT_STYLE.headerGradientFrom,
    headerGradientTo:
      typeof incomingStyle.headerGradientTo === "string" && incomingStyle.headerGradientTo.trim().length > 0
        ? incomingStyle.headerGradientTo
        : REMINDER_EMAIL_DEFAULT_STYLE.headerGradientTo,
    headingColor:
      typeof incomingStyle.headingColor === "string" && incomingStyle.headingColor.trim().length > 0
        ? incomingStyle.headingColor
        : REMINDER_EMAIL_DEFAULT_STYLE.headingColor,
    bodyTextColor:
      typeof incomingStyle.bodyTextColor === "string" && incomingStyle.bodyTextColor.trim().length > 0
        ? incomingStyle.bodyTextColor
        : REMINDER_EMAIL_DEFAULT_STYLE.bodyTextColor,
    subcopyTextColor:
      typeof incomingStyle.subcopyTextColor === "string" &&
      incomingStyle.subcopyTextColor.trim().length > 0
        ? incomingStyle.subcopyTextColor
        : REMINDER_EMAIL_DEFAULT_STYLE.subcopyTextColor,
    mutedTextColor:
      typeof incomingStyle.mutedTextColor === "string" && incomingStyle.mutedTextColor.trim().length > 0
        ? incomingStyle.mutedTextColor
        : REMINDER_EMAIL_DEFAULT_STYLE.mutedTextColor,
    bulletTextColor:
      typeof incomingStyle.bulletTextColor === "string" && incomingStyle.bulletTextColor.trim().length > 0
        ? incomingStyle.bulletTextColor
        : REMINDER_EMAIL_DEFAULT_STYLE.bulletTextColor,
    buttonBackgroundColor:
      typeof incomingStyle.buttonBackgroundColor === "string" &&
      incomingStyle.buttonBackgroundColor.trim().length > 0
        ? incomingStyle.buttonBackgroundColor
        : REMINDER_EMAIL_DEFAULT_STYLE.buttonBackgroundColor,
    buttonTextColor:
      typeof incomingStyle.buttonTextColor === "string" && incomingStyle.buttonTextColor.trim().length > 0
        ? incomingStyle.buttonTextColor
        : REMINDER_EMAIL_DEFAULT_STYLE.buttonTextColor,
  };

  const stages = REMINDER_STAGE_KEYS.reduce((acc, stageKey) => {
    const defaultStage = REMINDER_EMAIL_DEFAULT_STAGES[stageKey];
    const incoming = raw?.stages?.[stageKey];
    acc[stageKey] = {
      subjectA:
        typeof incoming?.subjectA === "string" && incoming.subjectA.trim().length > 0
          ? incoming.subjectA
          : defaultStage.subjectA,
      subjectB:
        typeof incoming?.subjectB === "string" && incoming.subjectB.trim().length > 0
          ? incoming.subjectB
          : defaultStage.subjectB,
      title:
        typeof incoming?.title === "string" && incoming.title.trim().length > 0
          ? incoming.title
          : defaultStage.title,
      bodyHtml:
        typeof incoming?.bodyHtml === "string" && incoming.bodyHtml.trim().length > 0
          ? incoming.bodyHtml
          : defaultStage.bodyHtml,
      ctaHref:
        typeof incoming?.ctaHref === "string" && incoming.ctaHref.trim().length > 0
          ? incoming.ctaHref
          : defaultStage.ctaHref,
      ctaLabel:
        typeof incoming?.ctaLabel === "string" && incoming.ctaLabel.trim().length > 0
          ? incoming.ctaLabel
          : defaultStage.ctaLabel,
    };
    return acc;
  }, {} as Record<ReminderStageKey, ReminderEmailStageContent>);

  return { style, stages };
}

