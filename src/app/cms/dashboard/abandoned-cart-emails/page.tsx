"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";
import {
  ABANDONED_CART_EMAIL_DEFAULT_CONFIG,
  buildAbandonedCartEmailConfigWithDefaults,
  type AbandonedCartEmailConfigInput,
  type AbandonedCartEmailStage,
} from "@/lib/abandoned-cart-email/config";

export default function AbandonedCartEmailsOverviewPage() {
  const [config, setConfig] = useState<AbandonedCartEmailConfigInput>(ABANDONED_CART_EMAIL_DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

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
    } catch (e) {
      console.error(e);
      setMessage("Could not load config.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const persistStages = async (stages: AbandonedCartEmailStage[]) => {
    const response = await fetch("/api/admin/abandoned-cart-emails/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload?.error || "Save failed.");
      return false;
    }
    setConfig(buildAbandonedCartEmailConfigWithDefaults(payload?.data || { stages }));
    setMessage("Saved.");
    return true;
  };

  const addStage = async () => {
    const newStage: AbandonedCartEmailStage = {
      id: `cart_${Date.now()}`,
      label: "New abandoned cart email",
      delayAmount: 6,
      delayUnit: "hours",
      subject: "Complete your CELPIP practice checkout",
      htmlBody:
        '<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif"><p>Hi {{first_name}},</p><p><a href="{{checkout_url}}">Return to checkout</a></p></body></html>',
      enabled: true,
      sortOrder: config.stages.length,
    };
    const ok = await persistStages([...config.stages, newStage]);
    if (ok) setMessage("New email added. Open it below to edit content.");
  };

  const deleteStage = async (stageId: string) => {
    if (!confirm("Delete this abandoned cart email?")) return;
    await persistStages(config.stages.filter((s) => s.id !== stageId));
  };

  return (
    <Box className="flex w-full flex-col gap-6 p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Abandoned cart emails (Resend)</h1>
        <p className="text-sm text-gray-600">
          Each step is a separate email sent after checkout is abandoned. Content is stored in your database and sent
          through{" "}
          <a className="text-primary underline" href="https://resend.com" target="_blank" rel="noreferrer">
            Resend
          </a>{" "}
          when your automation calls the API (configure <code className="text-xs">RESEND_API_KEY</code> and a verified{" "}
          <code className="text-xs">RESEND_FROM_EMAIL</code> or <code className="text-xs">FROM_EMAIL</code>).
        </p>
      </Box>

      {message ? <p className="text-sm font-medium text-gray-800">{message}</p> : null}

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : (
        <Box className="flex flex-col gap-3">
          {config.stages.map((stage) => (
            <Box
              key={stage.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                !stage.enabled ? "opacity-60" : ""
              }`}
            >
              <Box className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{stage.label}</p>
                <p className="text-xs text-gray-600">
                  Send after {stage.delayAmount} {stage.delayUnit} · {stage.enabled ? "Enabled" : "Disabled"}
                </p>
                <p className="truncate text-xs text-gray-500">Subject: {stage.subject}</p>
              </Box>
              <Box className="flex flex-wrap gap-2">
                <Link
                  href={`/cms/dashboard/abandoned-cart-emails/${encodeURIComponent(stage.id)}`}
                  className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Edit email
                </Link>
                <button
                  type="button"
                  onClick={() => deleteStage(stage.id)}
                  className="h-9 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <button
        type="button"
        onClick={addStage}
        disabled={isLoading}
        className="h-10 max-w-md rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50"
      >
        + Add another email step
      </button>

      <Box className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
        <p className="mb-2 font-semibold">Merge tags (use in subject and HTML)</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code>{"{{first_name}}"}</code> — recipient first name
          </li>
          <li>
            <code>{"{{email}}"}</code> — recipient email
          </li>
          <li>
            <code>{"{{checkout_url}}"}</code> — link back to Stripe / checkout
          </li>
          <li>
            <code>{"{{product_name}}"}</code> — plan or product label
          </li>
        </ul>
      </Box>
    </Box>
  );
}
