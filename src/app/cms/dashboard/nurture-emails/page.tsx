"use client";

import { useEffect, useMemo, useState } from "react";
import { Box } from "@/components/ui/Box";
import {
  buildNurtureEmailConfigWithDefaults,
  NURTURE_AUDIENCE,
  NURTURE_EMAIL_DEFAULT_CONFIG,
  NURTURE_TRIGGER_TYPES,
  type NurtureEmailConfigInput,
  type NurtureEmailStage,
  type NurtureTriggerType,
} from "@/lib/nurture-email/config";
import { NurtureStageCard } from "./NurtureStageCard";
import { MERGE_TAG_ROWS, TRIGGER_LABELS } from "./constants";

const DEFAULT_STAGE_TEMPLATE: Omit<NurtureEmailStage, "id" | "sortOrder"> = {
  label: "New conversion email",
  triggerType: "signup",
  delayAmount: 1,
  delayUnit: "days",
  subject: "{{first_name}}, ready for your next CELPIP step?",
  htmlBody:
    '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif"><p>Hi {{first_name}},</p><p></p><p><a href="{{pricing_url}}">See Plus plans</a></p></body></html>',
  enabled: true,
};

export default function NurtureEmailConfigPage() {
  const [config, setConfig] = useState<NurtureEmailConfigInput>(NURTURE_EMAIL_DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestStageId, setSendingTestStageId] = useState<string | null>(null);
  const [filterFlow, setFilterFlow] = useState<NurtureTriggerType | "all">("all");

  const loadConfig = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/nurture-emails/config", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not load nurture email config.");
        return;
      }
      setConfig(buildNurtureEmailConfigWithDefaults(payload?.data || null));
    } catch (error) {
      console.error("[nurture-email-cms] loadConfig failed:", error);
      setMessage("Could not load nurture email config.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/nurture-emails/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not save config.");
        return;
      }
      setMessage("Nurture sequence saved. Cron sends to non-subscribers only.");
      setConfig(buildNurtureEmailConfigWithDefaults(payload?.data || config));
      setEditingStageId(null);
    } catch (error) {
      console.error("[nurture-email-cms] saveConfig failed:", error);
      setMessage("Could not save nurture email config.");
    } finally {
      setIsSaving(false);
    }
  };

  const addNewStage = (triggerType: NurtureTriggerType = "signup") => {
    const newStage: NurtureEmailStage = {
      id: `nurture_${Date.now()}`,
      ...DEFAULT_STAGE_TEMPLATE,
      triggerType,
      sortOrder: config.stages.length,
    };
    setConfig((prev) => ({ ...prev, stages: [...prev.stages, newStage] }));
    setEditingStageId(newStage.id);
    setMessage("New stage added — save to persist.");
  };

  const updateStage = (stageId: string, updates: Partial<NurtureEmailStage>) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === stageId ? { ...s, ...updates } : s)),
    }));
  };

  const deleteStage = (stageId: string) => {
    if (!confirm("Delete this nurture email stage?")) return;
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

  const sendTestForStage = async (stage: NurtureEmailStage) => {
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
      const response = await fetch("/api/admin/nurture-emails/test-send", {
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
        setMessage(payload?.error || "Test send failed.");
        return;
      }
      setMessage(
        `Test sent for "${stage.label}" with sample merge tags (Resend: ${payload.resendId ?? "n/a"}).`
      );
    } catch (error) {
      console.error("[nurture-email-cms] sendTest failed:", error);
      setMessage("Test send failed.");
    } finally {
      setSendingTestStageId(null);
    }
  };

  const filteredStages = useMemo(() => {
    if (filterFlow === "all") return config.stages;
    return config.stages.filter((s) => s.triggerType === filterFlow);
  }, [config.stages, filterFlow]);

  const flowCounts = useMemo(() => {
    const counts: Record<NurtureTriggerType, number> = {
      signup: 0,
      free_user_active: 0,
      inactive_free: 0,
    };
    for (const s of config.stages) {
      if (s.enabled) counts[s.triggerType] += 1;
    }
    return counts;
  }, [config.stages]);

  return (
    <Box className="flex w-full flex-col gap-6 p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Nurture sequence (non-subscribers)</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Remarketing emails for users who have <strong>not</strong> subscribed to Plus. Runs hourly
          via <code className="rounded bg-gray-100 px-1 text-xs">/api/cron/nurture-emails</code>.
          Use <strong>Reminder Emails</strong> for activity nudges; use this page for conversion.
        </p>
        <p className="text-xs font-medium text-emerald-800">
          Audience: {NURTURE_AUDIENCE.replace(/_/g, " ")} — subscribers (plan: plus) are never emailed.
        </p>
      </Box>

      <Box className="grid gap-4 lg:grid-cols-3">
        <Box className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Sequence overview</h2>
          <div className="flex flex-wrap gap-2">
            {NURTURE_TRIGGER_TYPES.map((flow) => (
              <button
                key={flow}
                type="button"
                onClick={() => setFilterFlow(flow)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  filterFlow === flow
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {TRIGGER_LABELS[flow]} ({flowCounts[flow]} active)
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilterFlow("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filterFlow === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All stages
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
          pricing URL).
        </p>
      </Box>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : (
        <Box className="flex flex-col gap-4">
          {filteredStages.map((stage) => {
            const index = config.stages.findIndex((s) => s.id === stage.id);
            return (
              <NurtureStageCard
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

          <Box className="flex flex-wrap gap-2">
            {NURTURE_TRIGGER_TYPES.map((flow) => (
              <button
                key={flow}
                type="button"
                onClick={() => addNewStage(flow)}
                className="h-10 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-gray-400"
              >
                + Add {TRIGGER_LABELS[flow]} stage
              </button>
            ))}
          </Box>
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
        <h3 className="mb-2 text-sm font-semibold text-blue-900">Marketing playbook</h3>
        <ul className="space-y-2 text-xs text-blue-900">
          <li>
            <strong>Signup track:</strong> welcome → habit → Plus value → social proof → final nudge
            (days 0–14).
          </li>
          <li>
            <strong>Active free track:</strong> praise momentum → mock-exam pitch (after first
            practice).
          </li>
          <li>
            <strong>Inactive free track:</strong> win-back practice link → plans comparison (72h+
            idle).
          </li>
          <li>Cap: max 8 nurture emails per 30 days, 48h between sends (enforced by cron).</li>
          <li>Do not duplicate Reminder Emails — those focus on activity, not subscription.</li>
        </ul>
      </Box>
    </Box>
  );
}
