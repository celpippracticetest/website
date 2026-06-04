"use client";

import { useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";
import type { NurtureEmailStatsSummary } from "@/lib/nurture-email/metrics";
import { TRIGGER_LABELS } from "./constants";
import type { NurtureTriggerType } from "@/lib/nurture-email/config";

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function NurtureEmailStatsPanel() {
  const [stats, setStats] = useState<NurtureEmailStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/nurture-emails/stats", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "Could not load nurture email stats.");
        return;
      }
      setStats(payload.data ?? null);
    } catch {
      setError("Could not load nurture email stats.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <Box className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Delivery & engagement</h2>
          <p className="text-xs text-gray-600">
            Opens and clicks are recorded via Resend webhooks after{" "}
            <code className="rounded bg-gray-100 px-1">RESEND_WEBHOOK_SECRET</code> is set.
          </p>
        </div>
        <button
          type="button"
          onClick={loadStats}
          disabled={isLoading}
          className="h-8 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {isLoading && !stats ? (
        <p className="text-sm text-gray-600">Loading stats…</p>
      ) : stats ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Sent" value={String(stats.totals.sent)} />
            <StatCard label="Opened" value={String(stats.totals.opened)} />
            <StatCard label="Open rate" value={pct(stats.totals.openRate)} />
            <StatCard label="Clicked" value={String(stats.totals.clicked)} />
            <StatCard label="Click rate" value={pct(stats.totals.clickRate)} />
          </div>

          {stats.byStage.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 pr-4 font-medium">Stage</th>
                    <th className="py-2 pr-4 font-medium">Flow</th>
                    <th className="py-2 pr-4 font-medium">Sent</th>
                    <th className="py-2 pr-4 font-medium">Opened</th>
                    <th className="py-2 pr-4 font-medium">Open %</th>
                    <th className="py-2 pr-4 font-medium">Clicked</th>
                    <th className="py-2 font-medium">Click %</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byStage.map((row) => (
                    <tr key={`${row.stageId}:${row.flow}`} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-900">{row.stageLabel}</td>
                      <td className="py-2 pr-4 text-gray-700">
                        {TRIGGER_LABELS[row.flow as NurtureTriggerType] ?? row.flow}
                      </td>
                      <td className="py-2 pr-4 text-gray-900">{row.sent}</td>
                      <td className="py-2 pr-4 text-gray-900">{row.opened}</td>
                      <td className="py-2 pr-4 text-gray-900">{pct(row.openRate)}</td>
                      <td className="py-2 pr-4 text-gray-900">{row.clicked}</td>
                      <td className="py-2 text-gray-900">{pct(row.clickRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No nurture sends logged yet.</p>
          )}

          <p className="mt-3 text-xs text-gray-500">
            Webhook URL:{" "}
            <code className="rounded bg-gray-100 px-1">/api/resend/webhook</code> — subscribe to{" "}
            <code className="rounded bg-gray-100 px-1">email.opened</code> and{" "}
            <code className="rounded bg-gray-100 px-1">email.clicked</code>. Sends before this
            deploy lack <code className="rounded bg-gray-100 px-1">resendMessageId</code> tags and
            may not match opens reliably.
          </p>
        </>
      ) : null}
    </Box>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
