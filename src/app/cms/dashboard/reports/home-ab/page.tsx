"use client";

import React, { useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";
import BarChart from "@mui/icons-material/BarChart";
import Refresh from "@mui/icons-material/Refresh";

type VariantRow = {
  variant: string;
  page_views: number;
  checkout_started: number;
  purchases: number;
  checkout_rate: number;
  purchase_rate: number;
  purchase_per_checkout: number;
};

export default function HomeAbReportPage() {
  const [days, setDays] = useState(30);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    days: number;
    since: string;
    variants: VariantRow[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/home-ab-stats?days=${days}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && Array.isArray(json.variants)) {
          setData({
            days: json.days,
            since: json.since,
            variants: json.variants,
          });
        }
      })
      .catch((err) => console.error("home-ab-stats:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, refreshTick]);

  return (
    <Box className="w-full">
      <Box className="flex flex-col gap-6">
        <Box className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Homepage A/B conversion</h1>
        </Box>

        <Box className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <BarChart className="mt-0.5 h-6 w-6 text-indigo-600" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-700">
                  A/B: style 2 vs style 3 (50:50)
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  Conversion by homepage style
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-600">
                  New visitors to <code className="rounded bg-white/80 px-1">/</code> are assigned{" "}
                  <code className="rounded bg-white/80 px-1">passport</code> (style 2) or{" "}
                  <code className="rounded bg-white/80 px-1">legacy</code> (style 3) at random. Style 1 (
                  <code className="rounded bg-white/80 px-1">classic</code>) is available via preview{" "}
                  <code className="rounded bg-white/80 px-1">?s=1</code> only and is excluded from this
                  experiment. Metrics: page views (one per tab session, experiment arms only), checkout
                  starts, and Stripe purchases when{" "}
                  <code className="rounded bg-white/80 px-1">home_ab_variant</code> is{" "}
                  <code className="rounded bg-white/80 px-1">passport</code> or{" "}
                  <code className="rounded bg-white/80 px-1">legacy</code>. Preview{" "}
                  <code className="rounded bg-white/80 px-1">?s=2|3</code> does not count toward page
                  views.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>Range</span>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setRefreshTick((t) => t + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="Reload stats"
              >
                <Refresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {loading && !data ? (
            <p className="mt-4 text-sm text-gray-500">Loading experiment stats…</p>
          ) : data ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Style</th>
                    <th className="py-2 pr-4">Page views</th>
                    <th className="py-2 pr-4">Checkouts started</th>
                    <th className="py-2 pr-4">Purchases</th>
                    <th className="py-2 pr-4">Checkout / view</th>
                    <th className="py-2 pr-4">Purchase / view</th>
                    <th className="py-2 pr-4">Purchase / checkout</th>
                  </tr>
                </thead>
                <tbody>
                  {data.variants.map((row) => (
                    <tr key={row.variant} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {row.variant === "passport"
                          ? "Style 2 · passport (modern)"
                          : row.variant === "legacy"
                            ? "Style 3 · legacy (original)"
                            : row.variant}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-gray-800">{row.page_views}</td>
                      <td className="py-3 pr-4 tabular-nums text-gray-800">
                        {row.checkout_started}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-gray-800">{row.purchases}</td>
                      <td className="py-3 pr-4 tabular-nums text-gray-700">
                        {(row.checkout_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-emerald-700">
                        {(row.purchase_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-gray-700">
                        {(row.purchase_per_checkout * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-gray-500">
                Since {new Date(data.since).toLocaleDateString()} ({data.days}-day window).
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No experiment data yet.</p>
          )}
        </Box>
      </Box>
    </Box>
  );
}
