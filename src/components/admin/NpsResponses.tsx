"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { readinessLabel, type NpsReadiness } from "@/lib/nps";

type TriggerFilter = "all" | "mock_leave" | "practice_milestone";

interface NpsRow {
  id: string;
  userId: string;
  score: number;
  readiness?: NpsReadiness | null;
  reason?: string | null;
  trigger: "mock_leave" | "practice_milestone";
  contextLabel?: string | null;
  createdAt: string;
  name: string;
  email: string;
}

interface NpsStatistics {
  total: number;
  averageScore: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  scoreDistribution: Record<string, number>;
  readinessDistribution: Record<string, number>;
  triggerDistribution: Record<string, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function triggerLabel(trigger: NpsRow["trigger"]): string {
  return trigger === "mock_leave" ? "Mock leave" : "Practice milestone";
}

function scoreTone(score: number): string {
  if (score >= 9) return "bg-green-100 text-green-800";
  if (score >= 7) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export default function NpsResponses() {
  const { user } = useHybridWebUser();
  const [rows, setRows] = useState<NpsRow[]>([]);
  const [statistics, setStatistics] = useState<NpsStatistics | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResponses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
      });
      if (triggerFilter !== "all") params.set("trigger", triggerFilter);

      const response = await fetch(`/api/admin/nps?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load (${response.status})`);
      }
      const body = await response.json();
      setRows(Array.isArray(body?.data) ? body.data : []);
      setStatistics(body?.statistics ?? null);
      if (body?.pagination) setPagination(body.pagination);
    } catch (err) {
      console.error("Failed to load NPS responses:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, triggerFilter]);

  useEffect(() => {
    void loadResponses();
  }, [loadResponses]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Please sign in to access admin panel</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                NPS Responses
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Feedback from the in-app Net Promoter Score form
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadResponses()}
              className="cursor-pointer text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>

          {statistics ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-4 border-b border-gray-100">
              <StatCard label="Responses" value={String(statistics.total)} />
              <StatCard label="NPS" value={String(statistics.npsScore)} />
              <StatCard
                label="Avg score"
                value={String(statistics.averageScore)}
              />
              <StatCard
                label="Promoters"
                value={`${statistics.promoters}`}
                hint="9–10"
              />
              <StatCard
                label="Detractors"
                value={`${statistics.detractors}`}
                hint="0–6"
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between px-6 py-3">
            <div
              className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden"
              role="tablist"
              aria-label="Filter by trigger"
            >
              {(
                [
                  { key: "all", label: "All" },
                  { key: "mock_leave", label: "Mock leave" },
                  { key: "practice_milestone", label: "Practice" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={triggerFilter === t.key}
                  onClick={() => {
                    setPage(1);
                    setTriggerFilter(t.key);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium border-r last:border-r-0 transition-colors ${
                    triggerFilter === t.key
                      ? "bg-gray-100 text-gray-900"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              {pagination.total} total
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Loading NPS responses...
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No NPS responses yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Readiness
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trigger
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.id || `${row.userId}-${row.createdAt}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {row.name || "—"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {row.email || row.userId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${scoreTone(row.score)}`}
                        >
                          {row.score}/10
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {row.readiness ? readinessLabel(row.readiness) : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                        <div className="line-clamp-3 whitespace-pre-wrap">
                          {row.reason?.trim() || "—"}
                        </div>
                        {row.contextLabel ? (
                          <div className="mt-1 text-xs text-gray-400">
                            {row.contextLabel}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {triggerLabel(row.trigger)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint ? <div className="text-xs text-gray-400">{hint}</div> : null}
    </div>
  );
}
