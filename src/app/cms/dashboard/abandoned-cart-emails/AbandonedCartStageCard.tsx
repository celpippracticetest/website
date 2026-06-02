"use client";

import { EmailBodyPreview, EmailHtmlBodyEditor } from "@/components/admin/EmailHtmlBodyEditor";
import { Box } from "@/components/ui/Box";
import {
  ABANDONED_CART_TIME_UNITS,
  type AbandonedCartEmailStage,
  type AbandonedCartTimeUnit,
} from "@/lib/abandoned-cart-email/config";
import { sampleAbandonedCartMergeFields } from "@/lib/abandoned-cart-email/merge-fields";

type Props = {
  stage: AbandonedCartEmailStage;
  index: number;
  total: number;
  isEditing: boolean;
  isSendingTest: boolean;
  onEdit: () => void;
  onDoneEditing: () => void;
  onUpdate: (updates: Partial<AbandonedCartEmailStage>) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onTestSend: () => void;
};

export function AbandonedCartStageCard({
  stage,
  index,
  total,
  isEditing,
  isSendingTest,
  onEdit,
  onDoneEditing,
  onUpdate,
  onDelete,
  onMove,
  onTestSend,
}: Props) {
  const previewMergeFields = sampleAbandonedCartMergeFields();

  return (
    <Box
      className={`rounded-xl border bg-white p-5 shadow-sm ${!stage.enabled ? "opacity-60" : ""}`}
    >
      <Box className="flex items-start justify-between gap-4">
        <Box className="flex-1">
          {isEditing ? (
            <Box className="flex flex-col gap-4">
              <label className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">
                  Label <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={stage.label}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>

              <Box className="flex w-full gap-3">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Delay</span>
                  <input
                    type="number"
                    min={1}
                    value={stage.delayAmount}
                    onChange={(e) =>
                      onUpdate({ delayAmount: parseInt(e.target.value, 10) || 1 })
                    }
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Unit</span>
                  <select
                    value={stage.delayUnit}
                    onChange={(e) =>
                      onUpdate({ delayUnit: e.target.value as AbandonedCartTimeUnit })
                    }
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  >
                    {ABANDONED_CART_TIME_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
              </Box>
              <p className="text-xs text-gray-500">
                Send {stage.delayAmount} {stage.delayUnit} after checkout is abandoned.
              </p>

              <label className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Subject</span>
                <input
                  type="text"
                  value={stage.subject}
                  onChange={(e) => onUpdate({ subject: e.target.value })}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>

              <Box className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Email body</span>
                <EmailHtmlBodyEditor
                  value={stage.htmlBody}
                  onChange={(htmlBody) => onUpdate({ htmlBody })}
                  subject={stage.subject}
                  previewMergeFields={previewMergeFields}
                  placeholder="Full HTML email. Use {{first_name}}, {{checkout_url}}, {{product_name}}."
                />
              </Box>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={stage.enabled}
                  onChange={(e) => onUpdate({ enabled: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">Enabled</span>
              </label>

              <Box className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onDoneEditing}
                  className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
                >
                  Done editing
                </button>
                <button
                  type="button"
                  onClick={onTestSend}
                  disabled={isSendingTest}
                  className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSendingTest ? "Sending…" : "Send test email"}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="h-9 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600"
                >
                  Delete
                </button>
              </Box>
            </Box>
          ) : (
            <Box className="flex flex-col gap-2">
              <Box className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  #{index + 1}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{stage.label}</h3>
                {!stage.enabled && (
                  <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                    Disabled
                  </span>
                )}
              </Box>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Send:</span> {stage.delayAmount} {stage.delayUnit}{" "}
                after checkout abandoned
              </p>
              <p className="max-w-full truncate text-sm text-gray-600">
                <span className="font-medium">Subject:</span> {stage.subject}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-blue-700 hover:underline">
                  Show email preview
                </summary>
                <Box className="mt-2">
                  <EmailBodyPreview
                    value={stage.htmlBody}
                    subject={stage.subject}
                    previewMergeFields={previewMergeFields}
                    compact
                  />
                </Box>
              </details>
            </Box>
          )}
        </Box>

        {!isEditing && (
          <Box className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onTestSend}
              disabled={isSendingTest}
              className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSendingTest ? "Sending…" : "Test"}
            </button>
            <Box className="flex gap-1">
              <button
                type="button"
                onClick={() => onMove("up")}
                disabled={index === 0}
                className="h-8 w-8 rounded border border-gray-300 bg-white text-sm disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMove("down")}
                disabled={index === total - 1}
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
  );
}
