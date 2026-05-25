"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmailHtmlBodyEditor } from "@/components/admin/EmailHtmlBodyEditor";
import { Box } from "@/components/ui/Box";
import {
  SIGNUP_PERIOD_LABELS,
  type SignupPeriod,
} from "@/lib/admin/free-user-email-config";
import { NURTURE_MERGE_TAG_HELP } from "@/lib/nurture-email/merge-fields";

type AudienceRecipient = {
  userId: string;
  email: string;
  firstName: string;
  signedUpAt: string;
};

type AudienceData = {
  period: SignupPeriod;
  periodLabel: string;
  totalCount: number;
  sample: AudienceRecipient[];
  source: string;
};

const PERIOD_OPTIONS: SignupPeriod[] = ["last_3_days", "last_7_days", "last_30_days"];

const DEFAULT_SUBJECT = "{{first_name}}, unlock CELPIP Plus";
const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;">
  <p>Hi {{first_name}},</p>
  <p>You recently joined CELPIP Practice. Upgrade to Plus for full mock exams, AI feedback, and more.</p>
  <p><a href="{{pricing_url}}" style="color:#2563eb;font-weight:600;">See Plus plans</a></p>
  <p>Happy practicing,<br/>The CELPIP Practice team</p>
</body>
</html>`;

export default function UserEmailsPage() {
  const [period, setPeriod] = useState<SignupPeriod>("last_7_days");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [htmlBody, setHtmlBody] = useState(DEFAULT_HTML);
  const [testEmail, setTestEmail] = useState("");
  const [audience, setAudience] = useState<AudienceData | null>(null);
  const [isLoadingAudience, setIsLoadingAudience] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const mergeTagRows = useMemo(
    () =>
      Object.entries(NURTURE_MERGE_TAG_HELP).map(([key, meta]) => ({
        token: `{{${key}}}`,
        label: meta.label,
      })),
    []
  );

  const loadAudience = useCallback(async () => {
    setIsLoadingAudience(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/user-emails/audience?period=${encodeURIComponent(period)}`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not load audience.");
        setAudience(null);
        return;
      }
      setAudience(payload.data ?? null);
    } catch (error) {
      console.error("[user-emails-cms] loadAudience failed:", error);
      setMessage("Could not load audience.");
      setAudience(null);
    } finally {
      setIsLoadingAudience(false);
    }
  }, [period]);

  useEffect(() => {
    loadAudience();
  }, [loadAudience]);

  const sendTest = async () => {
    const to = testEmail.trim();
    if (!to) {
      setMessage("Enter a test recipient email.");
      return;
    }
    if (!subject.trim() || !htmlBody.trim()) {
      setMessage("Subject and HTML body are required.");
      return;
    }

    setIsSendingTest(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/user-emails/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, htmlBody }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const hint = payload?.hint ? ` ${payload.hint}` : "";
        setMessage([payload?.error || "Test send failed.", payload?.code, hint].filter(Boolean).join(" — "));
        return;
      }
      setMessage(`Test email sent via Resend (id: ${payload.resendId ?? "n/a"}). Subject prefixed with [TEST].`);
    } catch (error) {
      console.error("[user-emails-cms] sendTest failed:", error);
      setMessage("Test send failed.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const sendBulk = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      setMessage("Subject and HTML body are required.");
      return;
    }

    const count = audience?.totalCount ?? 0;
    if (count === 0) {
      setMessage("No recipients in this audience.");
      return;
    }

    const label = SIGNUP_PERIOD_LABELS[period];
    const capNote =
      count > 500 ? " (max 500 per send — run again for more)" : "";
    if (
      !confirm(
        `Send this email to up to ${Math.min(count, 500)} free users who signed up in ${label}?${capNote}\n\nThis cannot be undone.`
      )
    ) {
      return;
    }

    setIsSendingBulk(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/user-emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          subject,
          htmlBody,
          confirm: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Bulk send failed.");
        return;
      }

      const errSuffix =
        Array.isArray(payload.errors) && payload.errors.length > 0
          ? ` First errors: ${payload.errors.slice(0, 3).join("; ")}`
          : "";
      const capSuffix = payload.capped
        ? ` (capped at ${payload.cap} recipients — send again for more)`
        : "";

      setMessage(
        `Sent ${payload.sent}/${payload.attempted} emails for ${payload.periodLabel}.${capSuffix}${payload.failed ? ` ${payload.failed} failed.${errSuffix}` : ""}`
      );
    } catch (error) {
      console.error("[user-emails-cms] sendBulk failed:", error);
      setMessage("Bulk send failed.");
    } finally {
      setIsSendingBulk(false);
    }
  };

  return (
    <Box className="flex w-full max-w-5xl flex-col gap-6 p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Send email to free users</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          One-off broadcast to signed-up users who do <strong>not</strong> have a Plus plan.
          Emails are sent through{" "}
          <a className="text-primary underline" href="https://resend.com" target="_blank" rel="noreferrer">
            Resend
          </a>{" "}
          with personalized merge tags. Requires <code className="text-xs">RESEND_API_KEY</code> and a verified sender.
        </p>
      </Box>

      <Box className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Audience</h2>
        <Box className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                period === option
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {SIGNUP_PERIOD_LABELS[option]}
            </button>
          ))}
        </Box>
        <Box className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-700">
          {isLoadingAudience ? (
            <span>Loading audience…</span>
          ) : (
            <>
              <span className="font-semibold text-gray-900">
                {audience?.totalCount ?? 0} recipients
              </span>
              <span className="text-xs text-gray-500">
                Free plan only · signed up {SIGNUP_PERIOD_LABELS[period].toLowerCase()} · source:{" "}
                {audience?.source ?? "—"}
              </span>
              <button
                type="button"
                onClick={loadAudience}
                className="text-xs font-medium text-primary hover:underline"
              >
                Refresh
              </button>
            </>
          )}
        </Box>

        {!isLoadingAudience && audience && audience.sample.length > 0 && (
          <Box className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {audience.sample.map((row) => (
                  <tr key={row.userId} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-900">{row.email}</td>
                    <td className="px-3 py-2 text-gray-700">{row.firstName}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(row.signedUpAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audience.totalCount > audience.sample.length && (
              <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Showing {audience.sample.length} of {audience.totalCount} recipients.
              </p>
            )}
          </Box>
        )}
      </Box>

      <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Merge tags</h2>
        <ul className="space-y-1 text-xs text-gray-700">
          {mergeTagRows.map((row) => (
            <li key={row.token}>
              <code className="rounded bg-white px-1">{row.token}</code> — {row.label}
            </li>
          ))}
        </ul>
      </Box>

      <Box className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Subject line</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            placeholder="Email subject"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">HTML body</span>
          <EmailHtmlBodyEditor value={htmlBody} onChange={setHtmlBody} subject={subject} />
        </label>
      </Box>

      <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Test send</h2>
        <Box className="flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="h-10 min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 text-sm"
            autoComplete="email"
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={isSendingTest}
            className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSendingTest ? "Sending…" : "Send test email"}
          </button>
        </Box>
        <p className="mt-2 text-xs text-gray-600">
          Subject is prefixed with <code>[TEST]</code>. Preview uses sample merge tag values.
        </p>
      </Box>

      <Box className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 shadow-lg">
        <button
          type="button"
          onClick={sendBulk}
          disabled={isSendingBulk || isLoadingAudience || (audience?.totalCount ?? 0) === 0}
          className="h-10 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isSendingBulk
            ? "Sending…"
            : `Send to ${Math.min(audience?.totalCount ?? 0, 500)} users`}
        </button>
        {message ? (
          <p className="text-sm font-medium text-gray-700">{message}</p>
        ) : (
          <p className="text-xs text-gray-600">
            Bulk sends are capped at 500 recipients per run. Duplicates are skipped.
          </p>
        )}
      </Box>
    </Box>
  );
}
