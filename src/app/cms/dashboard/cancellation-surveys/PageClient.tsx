"use client";

import { useEffect, useMemo, useState } from "react";
import Refresh from "@mui/icons-material/Refresh";

interface CancellationSurvey {
  _id: string;
  userId: string;
  flowId?: string | null;
  reason: string;
  outcome?: "kept" | "cancelled" | null;
  otherReason?: string;
  alternativeService?: string;
  scores?: {
    listening: string;
    reading: string;
    writing: string;
    speaking: string;
  };
  serviceFeedback?: string;
  createdAt: string;
}

interface SurveysResponse {
  surveys: CancellationSurvey[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface RetentionSummaryResponse {
  days: number;
  summary: {
    started: number;
    kept: number;
    cancelled: number;
    keepRate: number;
    cancelRate: number;
  };
  reasonBreakdown: Array<{
    reason: string;
    count: number;
  }>;
  trend: Array<{
    _id: {
      date: string;
      eventName: string;
    };
    count: number;
  }>;
}

const KEEP_EVENT_NAMES = new Set([
  "keep_subscription_clicked",
  "kept_with_discount",
  "kept_on_final_confirmation",
  "pause_subscription_success",
  "contact_support_selected",
  "kept_flow_outcome",
]);

export default function CancellationSurveysPage() {
  const [surveys, setSurveys] = useState<CancellationSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [retentionSummary, setRetentionSummary] =
    useState<RetentionSummaryResponse | null>(null);

  const trendSeries = useMemo(() => {
    if (!retentionSummary?.trend?.length) {
      return [];
    }

    const bucket = new Map<
      string,
      { date: string; started: number; kept: number; cancelled: number }
    >();

    for (const item of retentionSummary.trend) {
      const date = item._id.date;
      const eventName = item._id.eventName;
      const current = bucket.get(date) || {
        date,
        started: 0,
        kept: 0,
        cancelled: 0,
      };

      if (eventName === "flow_opened") {
        current.started += item.count;
      } else if (eventName === "subscription_cancelled_success") {
        current.cancelled += item.count;
      } else if (KEEP_EVENT_NAMES.has(eventName)) {
        current.kept += item.count;
      }

      bucket.set(date, current);
    }

    return Array.from(bucket.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [retentionSummary]);

  const chartMeta = useMemo(() => {
    if (!trendSeries.length) return null;
    const maxValue = Math.max(
      ...trendSeries.map((d) => Math.max(d.started, d.kept, d.cancelled)),
      1
    );
    return { maxValue };
  }, [trendSeries]);

  const buildLinePoints = (
    key: "started" | "kept" | "cancelled",
    width: number,
    height: number,
    padding: number
  ) => {
    if (!trendSeries.length || !chartMeta) return "";

    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const xStep =
      trendSeries.length > 1 ? innerWidth / (trendSeries.length - 1) : 0;

    return trendSeries
      .map((point, index) => {
        const x = padding + index * xStep;
        const y =
          padding +
          innerHeight -
          (point[key] / chartMeta.maxValue) * innerHeight;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
      });

      const [surveysResponse, retentionResponse] = await Promise.all([
        fetch(`/api/admin/cancellation-surveys?${params}`),
        fetch("/api/admin/cancellation-retention?days=30"),
      ]);

      if (surveysResponse.ok) {
        const data: SurveysResponse = await surveysResponse.json();
        setSurveys(data.surveys);
        setPagination(data.pagination);
      }

      if (retentionResponse.ok) {
        const retentionData: RetentionSummaryResponse =
          await retentionResponse.json();
        setRetentionSummary(retentionData);
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, [page]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cancellation Reasons
          </h1>
          <p className="text-gray-600">
            Feedback submitted during cancellation flow (some users may keep instead of cancelling)
          </p>
        </div>
        <button
          onClick={fetchSurveys}
          className="p-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          title="Refresh"
        >
          <Refresh className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {retentionSummary && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Cancellation Retention ({retentionSummary.days}d)
            </h2>
            <p className="text-sm text-gray-600">
              Flow-level outcomes (kept and cancelled are deduplicated by flow)
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 min-w-[140px]">
              <div className="text-xs text-blue-700">Started Flow</div>
              <div className="text-xl font-semibold text-blue-900">
                {retentionSummary.summary.started}
              </div>
            </div>
            <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2 min-w-[140px]">
              <div className="text-xs text-green-700">Kept Subscription</div>
              <div className="text-xl font-semibold text-green-900">
                {retentionSummary.summary.kept}
              </div>
            </div>
            <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 min-w-[140px]">
              <div className="text-xs text-red-700">Cancelled</div>
              <div className="text-xl font-semibold text-red-900">
                {retentionSummary.summary.cancelled}
              </div>
            </div>
            <div className="rounded-md border border-purple-100 bg-purple-50 px-3 py-2 min-w-[140px]">
              <div className="text-xs text-purple-700">Keep Rate</div>
              <div className="text-xl font-semibold text-purple-900">
                {retentionSummary.summary.keepRate}%
              </div>
            </div>
          </div>

          {retentionSummary.reasonBreakdown.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Top Keep Reasons
              </h3>
              <div className="flex flex-wrap gap-2">
                {retentionSummary.reasonBreakdown.map((item) => (
                  <span
                    key={item.reason}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                  >
                    {item.reason}: {item.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {trendSeries.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Daily Trend
              </h3>
              <div className="w-full rounded-md border border-gray-200 p-3">
                <svg
                  viewBox="0 0 720 220"
                  className="w-full h-[220px]"
                  role="img"
                  aria-label="Cancellation retention trend line chart"
                >
                  <line
                    x1="40"
                    y1="180"
                    x2="700"
                    y2="180"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                  <line
                    x1="40"
                    y1="20"
                    x2="40"
                    y2="180"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />

                  <polyline
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    points={buildLinePoints("started", 720, 220, 40)}
                  />
                  <polyline
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="2.5"
                    points={buildLinePoints("kept", 720, 220, 40)}
                  />
                  <polyline
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    points={buildLinePoints("cancelled", 720, 220, 40)}
                  />
                </svg>

                <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Started
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-600" />
                    Kept
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    Cancelled
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                  <span>{trendSeries[0]?.date}</span>
                  <span>{trendSeries[trendSeries.length - 1]?.date}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading surveys...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {surveys.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    surveys.map((survey) => (
                      <tr key={survey._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {survey.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {survey.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {survey.outcome === "cancelled" ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Cancelled
                            </span>
                          ) : survey.outcome === "kept" ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Kept
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex flex-col gap-1">
                            {survey.otherReason && (
                              <div>
                                <span className="font-medium text-gray-700">Other: </span>
                                {survey.otherReason}
                              </div>
                            )}
                            {survey.alternativeService && (
                              <div>
                                <span className="font-medium text-gray-700">Alternative: </span>
                                {survey.alternativeService}
                              </div>
                            )}
                            {survey.scores && (
                              <div className="text-xs">
                                <span className="font-medium text-gray-700">Scores: </span>
                                L:{survey.scores.listening} R:{survey.scores.reading}{" "}
                                W:{survey.scores.writing} S:{survey.scores.speaking}
                              </div>
                            )}
                            {survey.serviceFeedback && (
                              <div className="italic mt-1">"{survey.serviceFeedback}"</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(survey.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(page - 1) * pagination.limit + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(page * pagination.limit, pagination.totalCount)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">{pagination.totalCount}</span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
