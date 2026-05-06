"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";
import {
  ABANDONED_CART_TIME_UNITS,
  buildAbandonedCartEmailConfigWithDefaults,
  type AbandonedCartEmailConfigInput,
  type AbandonedCartEmailStage,
  type AbandonedCartTimeUnit,
} from "@/lib/abandoned-cart-email/config";

export default function AbandonedCartEmailEditorPage() {
  const params = useParams();
  const router = useRouter();
  const stageId = typeof params?.stageId === "string" ? params.stageId : "";

  const [config, setConfig] = useState<AbandonedCartEmailConfigInput | null>(null);
  const [stage, setStage] = useState<AbandonedCartEmailStage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/abandoned-cart-emails/config", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not load config.");
        setConfig(null);
        setStage(null);
        return;
      }
      const resolved = buildAbandonedCartEmailConfigWithDefaults(payload?.data || null);
      setConfig(resolved);
      const found = resolved.stages.find((s) => s.id === stageId) ?? null;
      setStage(found);
      if (!found) {
        setMessage("This email step was not found. It may have been deleted.");
      }
    } catch (e) {
      console.error(e);
      setMessage("Could not load config.");
    } finally {
      setIsLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    if (stageId) load();
  }, [stageId, load]);

  const save = async () => {
    if (!config || !stage) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const stages = config.stages.map((s) => (s.id === stage.id ? stage : s));
      const response = await fetch("/api/admin/abandoned-cart-emails/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Save failed.");
        if (payload?.issues) {
          setMessage(`${payload.error} — see console for issues.`);
          console.error(payload.issues);
        }
        return;
      }
      const next = buildAbandonedCartEmailConfigWithDefaults(payload?.data || { stages });
      setConfig(next);
      const nextStage = next.stages.find((s) => s.id === stage.id) ?? stage;
      setStage(nextStage);
      setMessage("Saved successfully.");
    } catch (e) {
      console.error(e);
      setMessage("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendTest = async () => {
    if (!stage || !testEmail.trim()) {
      setMessage("Enter a test recipient email.");
      return;
    }
    setIsSendingTest(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/abandoned-cart-emails/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: stage.id, to: testEmail.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Test send failed.");
        return;
      }
      setMessage(`Test email sent (Resend id: ${payload.resendId ?? "n/a"}).`);
    } catch (e) {
      console.error(e);
      setMessage("Test send failed.");
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!stageId) {
    return (
      <Box className="p-6">
        <p className="text-sm text-gray-600">Invalid step.</p>
      </Box>
    );
  }

  return (
    <Box className="flex w-full flex-col gap-6 p-6">
      <Box className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/cms/dashboard/abandoned-cart-emails")}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← All abandoned cart emails
        </button>
      </Box>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : !stage ? (
        <Box className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {message || "Step not found."}
        </Box>
      ) : (
        <>
          <Box>
            <h1 className="text-2xl font-bold text-gray-900">Edit: {stage.label}</h1>
            <p className="text-sm text-gray-600">Subject and HTML are sent via Resend when your job triggers this step.</p>
          </Box>

          {message ? <p className="text-sm font-medium text-gray-800">{message}</p> : null}

          <Box className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Internal label</span>
              <input
                type="text"
                value={stage.label}
                onChange={(e) => setStage({ ...stage, label: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>

            <Box className="flex flex-wrap gap-3">
              <label className="flex flex-1 min-w-[120px] flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Delay amount</span>
                <input
                  type="number"
                  min={1}
                  value={stage.delayAmount}
                  onChange={(e) =>
                    setStage({ ...stage, delayAmount: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="flex flex-1 min-w-[140px] flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Delay unit</span>
                <select
                  value={stage.delayUnit}
                  onChange={(e) => setStage({ ...stage, delayUnit: e.target.value as AbandonedCartTimeUnit })}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                >
                  {ABANDONED_CART_TIME_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  checked={stage.enabled}
                  onChange={(e) => setStage({ ...stage, enabled: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">Enabled</span>
              </label>
            </Box>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Subject line</span>
              <input
                type="text"
                value={stage.subject}
                onChange={(e) => setStage({ ...stage, subject: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">HTML body</span>
              <textarea
                value={stage.htmlBody}
                onChange={(e) => setStage({ ...stage, htmlBody: e.target.value })}
                rows={18}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
            </label>

            <Box className="flex flex-wrap gap-3 border-t pt-4">
              <button
                type="button"
                onClick={save}
                disabled={isSaving}
                className="h-10 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save to database"}
              </button>
              <Link
                href="/cms/dashboard/abandoned-cart-emails"
                className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800"
              >
                Cancel
              </Link>
            </Box>
          </Box>

          <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Send test (merge tags filled with samples)</h2>
            <Box className="flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-10 min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 text-sm"
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
              Subject is prefixed with <code>[TEST]</code>. Requires <code>RESEND_API_KEY</code> and a verified sender
              domain in Resend.
            </p>
          </Box>
        </>
      )}
    </Box>
  );
}
