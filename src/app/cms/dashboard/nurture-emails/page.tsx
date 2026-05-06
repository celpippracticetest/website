"use client";

import { useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";
import TiptapBlogEditor from "@/components/dashboard-app/cms/TiptapBlogEditor";
import {
  buildNurtureEmailConfigWithDefaults,
  NURTURE_EMAIL_DEFAULT_CONFIG,
  type NurtureEmailConfigInput,
  type NurtureEmailStage,
  type TriggerType,
  type TimeUnit,
  TRIGGER_TYPES,
  TIME_UNITS,
} from "@/lib/nurture-email/config";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  signup: "After Signup",
  free_user_active: "Active Free User",
  premium_user: "Premium User",
};

export default function NurtureEmailConfigPage() {
  const [config, setConfig] = useState<NurtureEmailConfigInput>(NURTURE_EMAIL_DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestStageId, setSendingTestStageId] = useState<string | null>(null);

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

      const resolved = buildNurtureEmailConfigWithDefaults(payload?.data || null);
      setConfig(resolved);
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
      setMessage("Nurture email config saved successfully.");
      setConfig(buildNurtureEmailConfigWithDefaults(payload?.data || config));
      setEditingStageId(null);
    } catch (error) {
      console.error("[nurture-email-cms] saveConfig failed:", error);
      setMessage("Could not save nurture email config.");
    } finally {
      setIsSaving(false);
    }
  };

  const addNewStage = () => {
    const newStage: NurtureEmailStage = {
      id: `stage_${Date.now()}`,
      label: "New Nurture Stage",
      triggerType: "signup",
      delayAmount: 1,
      delayUnit: "days",
      subject: "New Email",
      bodyHtml: "<p>Write your email here...</p>",
      enabled: true,
      sortOrder: config.stages.length,
    };
    setConfig((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
    setEditingStageId(newStage.id);
    setMessage("New stage added. Remember to click 'Save Configuration' to persist changes.");
  };

  const updateStage = (stageId: string, updates: Partial<NurtureEmailStage>) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      ),
    }));
  };

  const deleteStage = (stageId: string) => {
    if (!confirm("Are you sure you want to delete this nurture stage?")) return;
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.filter((stage) => stage.id !== stageId),
    }));
    setEditingStageId(null);
    setMessage("Stage deleted. Click 'Save Configuration' to persist changes.");
  };

  const moveStage = (stageId: string, direction: "up" | "down") => {
    setConfig((prev) => {
      const stages = [...prev.stages];
      const index = stages.findIndex((s) => s.id === stageId);
      if (index === -1) return prev;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= stages.length) return prev;

      [stages[index], stages[newIndex]] = [stages[newIndex], stages[index]];

      // Update sortOrder
      stages.forEach((stage, idx) => {
        stage.sortOrder = idx;
      });

      return { ...prev, stages };
    });
    setMessage("Stage reordered. Click 'Save Configuration' to persist changes.");
  };

  const sendTestForStage = async (stage: NurtureEmailStage) => {
    const to = testEmail.trim();
    if (!to) {
      setMessage("Enter a test recipient email above.");
      return;
    }
    const subject = stage.subject?.trim();
    const bodyHtml = stage.bodyHtml?.trim();
    if (!subject || !bodyHtml) {
      setMessage("Subject and email body are required before sending a test.");
      return;
    }
    setSendingTestStageId(stage.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/nurture-emails/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, bodyHtml }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Test send failed.");
        return;
      }
      setMessage(`Test email sent for "${stage.label}" (Resend id: ${payload.resendId ?? "n/a"}).`);
    } catch (error) {
      console.error("[nurture-email-cms] sendTest failed:", error);
      setMessage("Test send failed.");
    } finally {
      setSendingTestStageId(null);
    }
  };

  return (
    <Box className="flex w-full flex-col gap-6 p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Nurture Sequence Config</h1>
        <p className="text-sm text-gray-600">
          Create and manage automated nurture email sequences to engage your users over time.
        </p>
      </Box>

      <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Send test emails (Resend)</h2>
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
          Subject is prefixed with <code className="rounded bg-white px-1">[TEST]</code>. Uses the current subject and
          body for each stage (including unsaved edits). Requires <code className="rounded bg-white px-1">RESEND_API_KEY</code>{" "}
          and a verified sender (<code className="rounded bg-white px-1">RESEND_FROM_EMAIL</code> or{" "}
          <code className="rounded bg-white px-1">FROM_EMAIL</code>).
        </p>
      </Box>

      <Box className="flex flex-col gap-4">
        {config.stages.map((stage, index) => (
          <Box
            key={stage.id}
            className={`rounded-xl border bg-white p-5 shadow-sm ${
              !stage.enabled ? "opacity-60" : ""
            }`}
          >
            <Box className="flex items-start justify-between gap-4">
              <Box className="flex-1">
                {editingStageId === stage.id ? (
                  // Edit Mode
                  <Box className="flex flex-col gap-4">
                    <Box className="flex flex-wrap gap-3">
                      <label className="flex w-full flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">
                          Label <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={stage.label}
                          onChange={(e) => updateStage(stage.id, { label: e.target.value })}
                          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                          placeholder="e.g., Day 1 - Welcome & Tips"
                        />
                      </label>

                      <label className="flex w-full flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">
                          Trigger Type <span className="text-red-500">*</span>
                        </span>
                        <select
                          value={stage.triggerType}
                          onChange={(e) =>
                            updateStage(stage.id, { triggerType: e.target.value as TriggerType })
                          }
                          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        >
                          {TRIGGER_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {TRIGGER_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <Box className="flex w-full gap-3">
                        <label className="flex flex-1 flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">
                            Delay Amount <span className="text-red-500">*</span>
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={stage.delayAmount}
                            onChange={(e) =>
                              updateStage(stage.id, {
                                delayAmount: parseInt(e.target.value) || 1,
                              })
                            }
                            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                          />
                        </label>

                        <label className="flex flex-1 flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">
                            Unit <span className="text-red-500">*</span>
                          </span>
                          <select
                            value={stage.delayUnit}
                            onChange={(e) =>
                              updateStage(stage.id, { delayUnit: e.target.value as TimeUnit })
                            }
                            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                          >
                            {TIME_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </label>
                      </Box>

                      <label className="flex w-full flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">
                          Subject <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={stage.subject}
                          onChange={(e) => updateStage(stage.id, { subject: e.target.value })}
                          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                          placeholder="e.g., Welcome to CELPIP Practice!"
                        />
                      </label>

                      <Box className="flex w-full flex-col gap-1 z-10">
                        <span className="text-sm font-medium text-gray-700">
                          Email Body (HTML) <span className="text-red-500">*</span>
                        </span>
                        <TiptapBlogEditor
                          initialContent={stage.bodyHtml}
                          placeholder="Write your email body here..."
                          onChange={({ html }) => updateStage(stage.id, { bodyHtml: html })}
                        />
                      </Box>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={stage.enabled}
                          onChange={(e) => updateStage(stage.id, { enabled: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-700">Enabled</span>
                      </label>
                    </Box>

                    <Box className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStageId(null);
                          setMessage("Changes made. Click 'Save Configuration' below to persist to database.");
                        }}
                        className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
                      >
                        Done Editing
                      </button>
                      <button
                        type="button"
                        onClick={() => sendTestForStage(stage)}
                        disabled={sendingTestStageId === stage.id}
                        className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {sendingTestStageId === stage.id ? "Sending…" : "Send test email"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStage(stage.id)}
                        className="h-9 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600"
                      >
                        Delete Stage
                      </button>
                    </Box>
                  </Box>
                ) : (
                  // View Mode
                  <Box className="flex flex-col gap-2">
                    <Box className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{stage.label}</h3>
                      {!stage.enabled && (
                        <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                          Disabled
                        </span>
                      )}
                    </Box>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Trigger:</span> {TRIGGER_LABELS[stage.triggerType]}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Delay:</span> {stage.delayAmount} {stage.delayUnit}
                    </p>
                    <p className="text-sm text-gray-600 truncate max-w-full">
                      <span className="font-medium">Subject:</span> {stage.subject}
                    </p>
                  </Box>
                )}
              </Box>

              {editingStageId !== stage.id && (
                <Box className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStageId(stage.id)}
                    className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => sendTestForStage(stage)}
                    disabled={sendingTestStageId === stage.id}
                    className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {sendingTestStageId === stage.id ? "Sending…" : "Test send"}
                  </button>
                  <Box className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveStage(stage.id, "up")}
                      disabled={index === 0}
                      className="h-8 w-8 rounded border border-gray-300 bg-white text-sm disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(stage.id, "down")}
                      disabled={index === config.stages.length - 1}
                      className="h-8 w-8 rounded border border-gray-300 bg-white text-sm disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        ))}

        {config.stages.length === 0 && (
          <Box className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-600">No nurture stages configured yet.</p>
          </Box>
        )}

        <button
          type="button"
          onClick={addNewStage}
          className="h-10 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          + Add New Sequence Stage
        </button>
      </Box>

      <Box className="sticky bottom-0 flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 shadow-lg">
        <button
          type="button"
          onClick={saveConfig}
          disabled={isSaving || isLoading}
          className="h-10 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white disabled:opacity-70 hover:bg-blue-700"
        >
          {isSaving ? "Saving..." : "💾 Save Configuration to Database"}
        </button>
        {message ? (
          <p className="text-sm font-medium text-gray-700">{message}</p>
        ) : (
          <p className="text-xs text-gray-600">
            Changes are not saved until you click this button
          </p>
        )}
      </Box>

      <Box className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">💡 How it works</h3>
        <ul className="space-y-2 text-xs text-blue-800">
          <li>• Setup a timed sequence of emails to nurture new leads or users</li>
          <li>• Set the delay from the trigger event (e.g., 1 day after Signup)</li>
          <li>• Compose the email directly using the rich text editor (emails are sent via Resend)</li>
          <li>• Use the Send test email button with a recipient address to preview the current subject and body in your inbox</li>
          <li>• Users will automatically receive these emails according to your timeline</li>
        </ul>
      </Box>
    </Box>
  );
}
