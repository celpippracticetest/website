"use client";

import { useMemo, useState } from "react";
import { Box } from "@/components/ui/Box";
import { renderNurtureEmail, sampleNurtureMergeFields } from "@/lib/nurture-email/merge-fields";

export type EmailBodyEditorMode = "html" | "preview";

type PreviewProps = {
  value: string;
  subject?: string;
  previewMergeFields?: Record<string, string>;
  compact?: boolean;
};

export function EmailBodyPreview({
  value,
  subject = "",
  previewMergeFields,
  compact = false,
}: PreviewProps) {
  const fields = useMemo(
    () => previewMergeFields ?? sampleNurtureMergeFields(),
    [previewMergeFields]
  );

  const preview = useMemo(() => {
    const body = value?.trim() || "";
    if (!body) {
      return {
        subject: subject.trim()
          ? renderNurtureEmail(subject, "", fields).subject
          : "(no subject)",
        html: `<p style="font-family:system-ui,sans-serif;color:#71717a;padding:16px;">No HTML body.</p>`,
      };
    }
    return renderNurtureEmail(subject || "Subject preview", body, fields);
  }, [value, subject, fields]);

  return (
    <Box className="rounded-lg border border-gray-300 bg-gray-50">
      <Box className="border-b border-gray-200 bg-white px-4 py-2">
        <p className="text-xs font-medium text-gray-500">Subject (preview)</p>
        <p className="text-sm font-semibold text-gray-900">{preview.subject}</p>
      </Box>
      <iframe
        title="Email preview"
        srcDoc={preview.html}
        sandbox=""
        className={`block w-full border-0 bg-white ${compact ? "min-h-[280px]" : "min-h-[420px]"}`}
      />
    </Box>
  );
}

type EditorProps = PreviewProps & {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
};

const tabClass = (active: boolean) =>
  `rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
    active
      ? "border border-b-0 border-gray-300 bg-white text-gray-900"
      : "border border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200"
  }`;

export function EmailHtmlBodyEditor({
  value,
  onChange,
  subject = "",
  previewMergeFields,
  rows = 18,
  placeholder = "<!DOCTYPE html>…",
}: EditorProps) {
  const [mode, setMode] = useState<EmailBodyEditorMode>("html");

  return (
    <Box className="flex w-full flex-col">
      <Box className="flex items-center gap-1 border-b border-gray-300">
        <button type="button" className={tabClass(mode === "html")} onClick={() => setMode("html")}>
          HTML
        </button>
        <button
          type="button"
          className={tabClass(mode === "preview")}
          onClick={() => setMode("preview")}
        >
          Preview
        </button>
        <span className="ml-auto pb-1 text-xs text-gray-500">Preview uses sample merge tags</span>
      </Box>

      {mode === "html" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          spellCheck={false}
          placeholder={placeholder}
          className="w-full rounded-b-lg rounded-tr-lg border border-gray-300 px-3 py-2 font-mono text-xs leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <Box className="rounded-b-lg rounded-tr-lg">
          <EmailBodyPreview
            value={value}
            subject={subject}
            previewMergeFields={previewMergeFields}
          />
        </Box>
      )}
    </Box>
  );
}
