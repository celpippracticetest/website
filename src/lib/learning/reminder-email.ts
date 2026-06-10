import { applyMergeTags } from "@/lib/email/resend-client";

export const LEARNING_REMINDER_MERGE_KEYS = [
  "first_name",
  "learning_url",
  "pending_skills",
  "pending_count",
  "skills_preview_html",
] as const;

export type LearningReminderLessonPreview = {
  skill: string;
  title?: string | null;
  focusArea?: string | null;
  linguisticKey?: string | null;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSkillName(skill: string): string {
  return skill.charAt(0) + skill.slice(1).toLowerCase();
}

export function buildSkillsPreviewHtml(
  lessons: LearningReminderLessonPreview[] | undefined
): string {
  if (!lessons?.length) {
    return `<p style="margin:0;font-size:14px;color:#1E3A8A;">Rubric comparisons, vocabulary drills, and exemplar analysis await in today's modules.</p>`;
  }

  return lessons
    .map((lesson) => {
      const skill = formatSkillName(lesson.skill);
      const title = escapeHtml(lesson.title?.trim() || `${skill} practice`);
      const focus = escapeHtml(lesson.focusArea?.trim() || "");
      const key = escapeHtml(lesson.linguisticKey?.trim() || "");

      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px 0;">
  <tr>
    <td style="padding:12px 14px;background-color:#ffffff;border-radius:6px;border:1px solid #BFDBFE;">
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;color:#316BFF;">${escapeHtml(skill)}</p>
      <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">${title}</p>
      ${focus ? `<p style="margin:0 0 4px 0;font-size:13px;color:#334155;"><strong>Focus:</strong> ${focus}</p>` : ""}
      ${key ? `<p style="margin:0;font-size:13px;color:#64748b;font-style:italic;">&ldquo;${key}&rdquo;</p>` : ""}
    </td>
  </tr>
</table>`;
    })
    .join("");
}

export function resolveLearningSiteOrigin(): string {
  const base =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://celpippracticetest.com";
  return base.replace(/\/+$/, "");
}

export function buildLearningReminderMergeFields(input: {
  firstName?: string | null;
  email?: string;
  pendingSkills?: string[];
  pendingCount?: number;
  pendingLessons?: LearningReminderLessonPreview[];
}): Record<string, string> {
  const origin = resolveLearningSiteOrigin();
  const localPart = input.email?.split("@")[0]?.trim() || "";
  const first = input.firstName?.trim() || localPart || "there";
  const skills = (input.pendingSkills ?? [])
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(", ");

  return {
    first_name: first,
    learning_url: `${origin}/learning`,
    pending_skills: skills || "your daily skills",
    pending_count: String(input.pendingCount ?? 0),
    skills_preview_html: buildSkillsPreviewHtml(input.pendingLessons),
  };
}

const DEFAULT_SUBJECT =
  "{{first_name}}, your CELPIP daily lesson is waiting";
const DEFAULT_SUBJECT_FALLBACK =
  "Your CELPIP daily lesson is waiting";

function hasPersonalizedFirstName(fields: Record<string, string>): boolean {
  const firstName = fields.first_name?.trim();
  return Boolean(firstName && firstName !== "there");
}

function renderLearningReminderSubject(
  fields: Record<string, string>,
  subjectTemplate: string
): string {
  if (
    !hasPersonalizedFirstName(fields) &&
    /{{\s*first_name\s*}}/i.test(subjectTemplate)
  ) {
    return DEFAULT_SUBJECT_FALLBACK;
  }
  return applyMergeTags(subjectTemplate, fields);
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>Your CELPIP daily lesson is ready</title>
</head>
<body style="margin:0;padding:0;background-color:#F2F6FF;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F2F6FF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#316BFF;">CELPIP Practice Test</p>
              <h1 style="margin:16px 0 0 0;font-size:24px;line-height:1.25;color:#0f172a;">Your daily lesson is ready</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;font-size:16px;line-height:1.6;color:#334155;">
              <p style="margin:0 0 16px 0;">Hi {{first_name}},</p>
              <p style="margin:0 0 16px 0;">You have <strong>{{pending_count}}</strong> skill lesson(s) waiting for you today.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#EFF6FF;border-left:4px solid #316BFF;border-radius:4px;margin:0 0 16px 0;padding:16px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1E40AF;">Up next for you</p>
                    {{skills_preview_html}}
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px 0;">Open today's module to unlock the full rubric side-by-sides, vocabulary bank, and practice drills tailored to your CLB goals.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:8px;background-color:#316BFF;">
                    <a href="{{learning_url}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Continue learning</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:#64748b;">Or copy this link into your browser:</p>
              <p style="margin:8px 0 0 0;font-size:13px;word-break:break-all;color:#316BFF;">{{learning_url}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.6;color:#64748b;">
              <p style="margin:0;">CELPIPPRACTICETEST.com is not affiliated with Paragon Testing Enterprises or the CELPIP exam.</p>
              <p style="margin:12px 0 0 0;">Questions? We're here to help! Contact <a href="mailto:support@celpippracticetest.com" style="color:#316BFF;font-weight:600;text-decoration:none;">support@celpippracticetest.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function renderLearningReminderEmail(
  fields: Record<string, string>,
  subjectTemplate: string = DEFAULT_SUBJECT,
  htmlTemplate: string = DEFAULT_HTML
): { subject: string; html: string } {
  return {
    subject: renderLearningReminderSubject(fields, subjectTemplate),
    html: applyMergeTags(htmlTemplate, fields),
  };
}
