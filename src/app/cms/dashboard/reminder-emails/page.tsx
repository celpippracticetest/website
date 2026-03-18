"use client";

import { useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";
import {
  buildReminderEmailConfigWithDefaults,
  REMINDER_EMAIL_DEFAULT_CONFIG,
  type ReminderEmailConfigInput,
  type ReminderEmailStage,
  type TriggerType,
  type TimeUnit,
  TRIGGER_TYPES,
  TIME_UNITS,
} from "@/lib/reminder-email/config";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  signup_no_activity: "After Signup (No Activity)",
  inactive: "After User Becomes Inactive",
};

export default function ReminderEmailConfigPage() {
  const [config, setConfig] = useState<ReminderEmailConfigInput>(REMINDER_EMAIL_DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const loadConfig = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/reminder-emails/config", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not load reminder email config.");
        return;
      }

      const resolved = buildReminderEmailConfigWithDefaults(payload?.data || null);
      setConfig(resolved);
    } catch (error) {
      console.error("[reminder-email-cms] loadConfig failed:", error);
      setMessage("Could not load reminder email config.");
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
      const response = await fetch("/api/admin/reminder-emails/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not save config.");
        return;
      }
      setMessage("Reminder email config saved successfully.");
      setConfig(buildReminderEmailConfigWithDefaults(payload?.data || config));
      setEditingStageId(null);
    } catch (error) {
      console.error("[reminder-email-cms] saveConfig failed:", error);
      setMessage("Could not save reminder email config.");
    } finally {
      setIsSaving(false);
    }
  };

  const addNewStage = () => {
    const newStage: ReminderEmailStage = {
      id: `stage_${Date.now()}`,
      label: "New Reminder Stage",
      triggerType: "signup_no_activity",
      delayAmount: 1,
      delayUnit: "days",
      senderCode: "",
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

  const updateStage = (stageId: string, updates: Partial<ReminderEmailStage>) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      ),
    }));
  };

  const deleteStage = (stageId: string) => {
    if (!confirm("Are you sure you want to delete this reminder stage?")) return;
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

  return (
    <Box className="flex w-full flex-col gap-6 p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Reminder Email Config</h1>
        <p className="text-sm text-gray-600">
          Create and manage reminder email stages with custom timing and triggers.
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
                          placeholder="e.g., Welcome Email - 20min"
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
                          Sender.net Code <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={stage.senderCode}
                          onChange={(e) => updateStage(stage.id, { senderCode: e.target.value })}
                          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                          placeholder="e.g., dRLDzY"
                        />
                      </label>

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

                    <Box className="flex gap-2">
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
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Sender Code:</span>{" "}
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                        {stage.senderCode || "(not set)"}
                      </code>
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
            <p className="text-sm text-gray-600">No reminder stages configured yet.</p>
          </Box>
        )}

        <button
          type="button"
          onClick={addNewStage}
          className="h-10 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          + Add New Reminder Stage
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
          <li>• Create custom reminder stages with your own timing</li>
          <li>• Set trigger type: after signup (no activity) or after user becomes inactive</li>
          <li>• Configure delay: X minutes, hours, or days</li>
          <li>• Map each stage to a Sender.net transactional email template code</li>
          <li>• Enable/disable stages without deleting them</li>
          <li>• Reorder stages to control the sequence</li>
        </ul>
      </Box>
    </Box>
  );
}
