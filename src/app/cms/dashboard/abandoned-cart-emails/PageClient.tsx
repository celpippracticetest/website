"use client";

import { useEffect, useMemo, useState } from "react";
import { Box } from "@/components/ui/Box";
import {
  ABANDONED_CART_EMAIL_DEFAULT_CONFIG,
  buildAbandonedCartEmailConfigWithDefaults,
  type AbandonedCartEmailConfigInput,
  type AbandonedCartEmailStage,
} from "@/lib/abandoned-cart-email/config";
import { AbandonedCartStageCard } from "./AbandonedCartStageCard";
import { MERGE_TAG_ROWS, SEQUENCE_DESCRIPTION } from "./constants";

const DEFAULT_STAGE_TEMPLATE: Omit<AbandonedCartEmailStage, "id" | "sortOrder"> = {
  label: "New abandoned cart email",
  delayAmount: 6,
  delayUnit: "hours",
  subject: "Complete your CELPIP practice checkout",
  htmlBody:
    '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif"><p>Hi {{first_name}},</p><p></p><p><a href="{{checkout_url}}">Return to checkout</a></p></body></html>',
  enabled: true,
};

export default function AbandonedCartEmailConfigPage() {
  const [config, setConfig] = useState<AbandonedCartEmailConfigInput>(ABANDONED_CART_EMAIL_DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestStageId, setSendingTestStageId] = useState<string | null>(null);
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);

  const loadConfig = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/abandoned-cart-emails/config", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not load abandoned cart email config.");
        return;
      }
      setConfig(buildAbandonedCartEmailConfigWithDefaults(payload?.data || null));
    } catch (error) {
      console.error("[abandoned-cart-email-cms] loadConfig failed:", error);
      setMessage("Could not load abandoned cart email config.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (isLoading || config.stages.length === 0) return;
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) return;
    const stage = config.stages.find((s) => s.id === decodeURIComponent(hash));
    if (stage) {
      setEditingStageId(stage.id);
      setShowEnabledOnly(false);
    }
  }, [isLoading, config.stages]);

  const saveConfig = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/abandoned-cart-emails/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not save config.");
        return;
      }
      setMessage("Abandoned cart sequence saved.");
      setConfig(buildAbandonedCartEmailConfigWithDefaults(payload?.data || config));
      setEditingStageId(null);
    } catch (error) {
      console.error("[abandoned-cart-email-cms] saveConfig failed:", error);
      setMessage("Could not save abandoned cart email config.");
    } finally {
      setIsSaving(false);
    }
  };

  const addNewStage = () => {
    const newStage: AbandonedCartEmailStage = {
      id: `cart_${Date.now()}`,
      ...DEFAULT_STAGE_TEMPLATE,
      sortOrder: config.stages.length,
    };
    setConfig((prev) => ({ ...prev, stages: [...prev.stages, newStage] }));
    setEditingStageId(newStage.id);
    setMessage("New stage added — save to persist.");
  };

  const updateStage = (stageId: string, updates: Partial<AbandonedCartEmailStage>) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === stageId ? { ...s, ...updates } : s)),
    }));
  };

  const deleteStage = (stageId: string) => {
    if (!confirm("Delete this abandoned cart email stage?")) return;
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== stageId),
    }));
    setEditingStageId(null);
    setMessage("Stage removed — save to persist.");
  };

  const moveStage = (stageId: string, direction: "up" | "down") => {
    setConfig((prev) => {
      const stages = [...prev.stages];
      const index = stages.findIndex((s) => s.id === stageId);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= stages.length) return prev;
      [stages[index], stages[newIndex]] = [stages[newIndex], stages[index]];
      stages.forEach((s, idx) => {
        s.sortOrder = idx;
      });
      return { ...prev, stages };
    });
  };

  const sendTestForStage = async (stage: AbandonedCartEmailStage) => {
    const to = testEmail.trim();
    if (!to) {
      setMessage("Enter a test recipient email above.");
      return;
    }
    if (!stage.subject?.trim() || !stage.htmlBody?.trim()) {
      setMessage("Subject and body are required.");
      return;
    }
    setSendingTestStageId(stage.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/abandoned-cart-emails/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: stage.subject,
          htmlBody: stage.htmlBody,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const issueHint = Array.isArray(payload?.issues)
          ? payload.issues
              .map((i: { path?: string[]; message?: string }) =>
                [i.path?.join("."), i.message].filter(Boolean).join(": ")
              )
              .join(" · ")
          : "";
        const hint = payload?.hint ? ` ${payload.hint}` : "";
        setMessage(
          [payload?.error || "Test send failed.", payload?.code, issueHint, hint]
            .filter(Boolean)
            .join(" — ")
        );
        return;
      }
      setMessage(
        `Test sent for "${stage.label}" with sample merge tags (Resend: ${payload.resendId ?? "n/a"}).`
      );
    } catch (error) {
      console.error("[abandoned-cart-email-cms] sendTest failed:", error);
      setMessage("Test send failed.");
    } finally {
      setSendingTestStageId(null);
    }
  };

  const enabledCount = useMemo(
    () => config.stages.filter((s) => s.enabled).length,
    [config.stages]
  );

  const filteredStages = useMemo(() => {
    if (!showEnabledOnly) return config.stages;
    return config.stages.filter((s) => s.enabled);
  }, [config.stages, showEnabledOnly]);

  return (
    <Box className="flex w-full flex-col gap-6 p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Abandoned cart sequence</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Recovery emails for users who start checkout but do not complete payment. Sent via Resend
          when your automation triggers each step. Configure{" "}
          <code className="rounded bg-gray-100 px-1 text-xs">RESEND_API_KEY</code> and a verified
          sender.
        </p>
        <p className="text-xs font-medium text-emerald-800">
          Audience: users with an incomplete checkout — one step per delay after abandonment.
        </p>
      </Box>

      <Box className="grid gap-4 lg:grid-cols-3">
        <Box className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Sequence overview</h2>
          <p className="mb-3 text-xs text-gray-600">{SEQUENCE_DESCRIPTION}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowEnabledOnly(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                !showEnabledOnly
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All stages ({config.stages.length})
            </button>
            <button
              type="button"
              onClick={() => setShowEnabledOnly(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                showEnabledOnly
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Enabled only ({enabledCount})
            </button>
          </div>
        </Box>

        <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Merge tags</h2>
          <ul className="space-y-1 text-xs text-gray-700">
            {MERGE_TAG_ROWS.map((row) => (
              <li key={row.key}>
                <code className="rounded bg-white px-1">{row.token}</code> — {row.label}
              </li>
            ))}
          </ul>
        </Box>
      </Box>

      <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Test sends (Resend)</h2>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Test recipient</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="h-10 max-w-md rounded-lg border border-gray-300 px-3 text-sm"
            autoComplete="email"
          />
        </label>
        <p className="mt-2 text-xs text-gray-600">
          Subject is prefixed with [TEST]. Merge tags are filled with sample values (e.g. Alex,
          sample checkout URL).
        </p>
      </Box>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : (
        <Box className="flex flex-col gap-4">
          {filteredStages.map((stage) => {
            const index = config.stages.findIndex((s) => s.id === stage.id);
            return (
              <AbandonedCartStageCard
                key={stage.id}
                stage={stage}
                index={index}
                total={config.stages.length}
                isEditing={editingStageId === stage.id}
                isSendingTest={sendingTestStageId === stage.id}
                onEdit={() => setEditingStageId(stage.id)}
                onDoneEditing={() => {
                  setEditingStageId(null);
                  setMessage("Click Save below to persist changes.");
                }}
                onUpdate={(updates) => updateStage(stage.id, updates)}
                onDelete={() => deleteStage(stage.id)}
                onMove={(dir) => moveStage(stage.id, dir)}
                onTestSend={() => sendTestForStage(stage)}
              />
            );
          })}

          {filteredStages.length === 0 && (
            <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-600">No stages for this filter.</p>
            </Box>
          )}

          <button
            type="button"
            onClick={addNewStage}
            className="h-10 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-gray-400"
          >
            + Add email step
          </button>
        </Box>
      )}

      <Box className="sticky bottom-0 flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 shadow-lg">
        <button
          type="button"
          onClick={saveConfig}
          disabled={isSaving || isLoading}
          className="h-10 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
        >
          {isSaving ? "Saving…" : "Save sequence"}
        </button>
        {message ? (
          <p className="text-sm font-medium text-gray-700">{message}</p>
        ) : (
          <p className="text-xs text-gray-600">Changes are not live until you save.</p>
        )}
      </Box>

      <Box className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">Recovery playbook</h3>
        <ul className="space-y-2 text-xs text-blue-900">
          <li>
            <strong>Step 1 (2h):</strong> gentle nudge — ask if something went wrong, link back to
            checkout.
          </li>
          <li>
            <strong>Step 2 (24h):</strong> social proof — highlight mock exams and learner success.
          </li>
          <li>
            <strong>Step 3 (48h):</strong> final reminder — last chance to complete checkout.
          </li>
          <li>Use <code className="rounded bg-white px-1">{"{{checkout_url}}"}</code> in every CTA so users return to their session.</li>
          <li>Keep copy short; one clear CTA per email.</li>
        </ul>
      </Box>
    </Box>
  );
}
