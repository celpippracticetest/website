"use client";

import { useEffect, useMemo, useState } from "react";
import { Box } from "@/components/ui/Box";
import {
  buildReminderEmailConfigWithDefaults,
  REMINDER_EMAIL_DEFAULT_CONFIG,
  REMINDER_STAGE_KEYS,
  type ReminderEmailConfigInput,
  type ReminderStageKey,
} from "@/lib/reminder-email/config";
import { renderReminderEmailHtml } from "@/lib/reminder-email/render";

const STAGE_LABELS: Record<ReminderStageKey, string> = {
  signup_welcome_20m_no_activity: "Signup - 20m Welcome",
  signup_day1_no_activity: "Signup - Day 1",
  signup_day3_no_activity: "Signup - Day 3",
  signup_day7_final_nudge_no_activity: "Signup - Day 7 Final Nudge",
  inactive_day1: "Inactive - Day 1",
  inactive_day7: "Inactive - Day 7",
};

export default function ReminderEmailConfigPage() {
  const [config, setConfig] = useState<ReminderEmailConfigInput>(REMINDER_EMAIL_DEFAULT_CONFIG);
  const [selectedStage, setSelectedStage] = useState<ReminderStageKey>(REMINDER_STAGE_KEYS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stageConfig = useMemo(() => config.stages[selectedStage], [config, selectedStage]);
  const previewHtml = useMemo(
    () =>
      renderReminderEmailHtml({
        firstName: "Reza",
        style: config.style,
        stage: stageConfig,
      }),
    [config.style, stageConfig]
  );

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
    } catch (error) {
      console.error("[reminder-email-cms] saveConfig failed:", error);
      setMessage("Could not save reminder email config.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStyle = (key: keyof ReminderEmailConfigInput["style"], value: string) => {
    setConfig((prev) => ({
      ...prev,
      style: {
        ...prev.style,
        [key]: value,
      },
    }));
  };

  const updateStageField = (
    key: keyof ReminderEmailConfigInput["stages"][ReminderStageKey],
    value: string | string[]
  ) => {
    setConfig((prev) => ({
      ...prev,
      stages: {
        ...prev.stages,
        [selectedStage]: {
          ...prev.stages[selectedStage],
          [key]: value,
        },
      },
    }));
  };

  const resetStageToDefault = () => {
    const defaultStage = REMINDER_EMAIL_DEFAULT_CONFIG.stages[selectedStage];
    setConfig((prev) => ({
      ...prev,
      stages: {
        ...prev.stages,
        [selectedStage]: defaultStage,
      },
    }));
    setMessage("Selected stage reset to default values.");
  };

  const resetAllToDefault = () => {
    setConfig(REMINDER_EMAIL_DEFAULT_CONFIG);
    setMessage("All reminder email content reset to defaults.");
  };

  return (
    <Box className="flex w-full flex-col gap-6 p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Reminder Email Config</h1>
        <p className="text-sm text-gray-600">
          Configure reminder email copy and visual style for each lifecycle stage.
        </p>
      </Box>

      <Box className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm">
        <Box className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Visual Style</h2>
          <button
            type="button"
            onClick={resetAllToDefault}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800"
          >
            Reset All to Default
          </button>
        </Box>

        <Box className="flex flex-wrap gap-3">
          <label className="flex w-[320px] flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Logo URL</span>
            <input
              type="text"
              value={config.style.logoUrl ?? ""}
              onChange={(event) => updateStyle("logoUrl", event.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>
          <label className="flex w-[280px] flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Brand Label</span>
            <input
              type="text"
              value={config.style.brandLabel ?? ""}
              onChange={(event) => updateStyle("brandLabel", event.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>
          {(
            [
              "pageBackgroundColor",
              "cardBackgroundColor",
              "cardBorderColor",
              "headerGradientFrom",
              "headerGradientTo",
              "headingColor",
              "bodyTextColor",
              "buttonBackgroundColor",
              "buttonTextColor",
            ] as const
          ).map((colorKey) => (
            <label key={colorKey} className="flex w-[180px] flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{colorKey}</span>
              <input
                type="text"
                value={config.style[colorKey] ?? ""}
                onChange={(event) => updateStyle(colorKey, event.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>
          ))}
        </Box>
      </Box>

      <Box className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm">
        <Box className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Stage Content</h2>
          <button
            type="button"
            onClick={resetStageToDefault}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800"
          >
            Reset Selected Stage
          </button>
        </Box>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Stage</span>
          <select
            value={selectedStage}
            onChange={(event) => setSelectedStage(event.target.value as ReminderStageKey)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          >
            {REMINDER_STAGE_KEYS.map((stageKey) => (
              <option key={stageKey} value={stageKey}>
                {STAGE_LABELS[stageKey]}
              </option>
            ))}
          </select>
        </label>

        <Box className="flex flex-wrap gap-3">
          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Subject A</span>
            <input
              type="text"
              value={stageConfig.subjectA ?? ""}
              onChange={(event) => updateStageField("subjectA", event.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>
          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Subject B</span>
            <input
              type="text"
              value={stageConfig.subjectB ?? ""}
              onChange={(event) => updateStageField("subjectB", event.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>
          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Email Title</span>
            <input
              type="text"
              value={stageConfig.title ?? ""}
              onChange={(event) => updateStageField("title", event.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>
          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Body HTML</span>
            <textarea
              value={stageConfig.bodyHtml ?? ""}
              onChange={(event) => updateStageField("bodyHtml", event.target.value)}
              className="min-h-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">CTA URL</span>
            <input
              type="text"
              value={stageConfig.ctaHref ?? ""}
              onChange={(event) => updateStageField("ctaHref", event.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>
          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">CTA Label</span>
            <input
              type="text"
              value={stageConfig.ctaLabel ?? ""}
              onChange={(event) => updateStageField("ctaLabel", event.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>
        </Box>

        <Box className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Generated HTML Code</h3>
          <textarea
            readOnly
            value={previewHtml}
            className="min-h-[220px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono"
          />
        </Box>

        <Box className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">User View Preview</h3>
          <iframe
            title="Reminder email preview"
            srcDoc={previewHtml}
            className="h-[520px] w-full rounded-lg border border-gray-300 bg-white"
          />
        </Box>
      </Box>

      <Box className="flex items-center gap-3">
        <button
          type="button"
          onClick={saveConfig}
          disabled={isSaving || isLoading}
          className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save Reminder Email Config"}
        </button>
        {message ? <p className="text-sm text-gray-600">{message}</p> : null}
      </Box>
    </Box>
  );
}

