"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Download from "@mui/icons-material/Download";
import CalendarToday from "@mui/icons-material/CalendarToday";
import Schedule from "@mui/icons-material/Schedule";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Warning from "@mui/icons-material/Warning";
import CheckCircle from "@mui/icons-material/CheckCircle";
import HighlightOff from "@mui/icons-material/HighlightOff";
import Insights from "@mui/icons-material/Insights";
import Psychology from "@mui/icons-material/Psychology";
import MenuBook from "@mui/icons-material/MenuBook";
import Description from "@mui/icons-material/Description";
import People from "@mui/icons-material/People";
import Language from "@mui/icons-material/Language";
import Smartphone from "@mui/icons-material/Smartphone";

interface ActivitySummary {
  practiceAttempted: number;
  practiceCompleted: number;
  mockAttempted: number;
  mockCompleted: number;
  practiceTokens: number;
  mockTokens: number;
  learningTokens: number;
  lastActive: string | null;
}

interface Activity {
  _id: string;
  eventType: string;
  context: string;
  skill?: string;
  attemptId?: string;
  contentId?: string;
  status?: string;
  durationSeconds?: number;
  scoreOverall?: number;
  scoreBreakdownJson?: string;
  llmTokensPrompt: number;
  llmTokensCompletion: number;
  ipAddress?: string;
  deviceUaHash?: string;
  userAgent?: string;
  notes?: string;
  timestampUtc: string;
}

interface ChallengeProfile {
  mode?: string;
  status?: string;
  targetClb?: number;
  windowDays?: number;
  refundPercent?: number;
  offerSource?: string;
  tierKey?: string;
  startsAt?: string;
  deadlineAt?: string | null;
  updatedAt?: string;
}

interface UserActivitiesResponse {
  activities: Activity[];
  summary: ActivitySummary;
  challengeProfile?: ChallengeProfile | null;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({
    practiceAttempted: 0,
    practiceCompleted: 0,
    mockAttempted: 0,
    mockCompleted: 0,
    practiceTokens: 0,
    mockTokens: 0,
    learningTokens: 0,
    lastActive: null,
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

  // Filters
  const [timeRange, setTimeRange] = useState("7days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [context, setContext] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState("");
  const [hasScore, setHasScore] = useState("");
  const [search, setSearch] = useState("");
  const [challengeProfile, setChallengeProfile] = useState<ChallengeProfile | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add time range
      if (timeRange === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      } else if (timeRange !== "all") {
        const now = new Date();
        let start: Date;

        switch (timeRange) {
          case "7days":
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30days":
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "thismonth":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "lastmonth":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            params.append("endDate", end.toISOString().split("T")[0]);
            break;
          default:
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        if (timeRange !== "lastmonth") {
          params.append("startDate", start.toISOString().split("T")[0]);
        }
      }

      // Add other filters
      if (eventType) params.append("eventType", eventType);
      if (context) params.append("context", context);
      if (skill) params.append("skill", skill);
      if (status) params.append("status", status);
      if (hasScore) params.append("hasScore", hasScore);
      if (search) params.append("search", search);

      const response = await fetch(`/api/user-activity/${userId}?${params}`);
      if (response.ok) {
        const data: UserActivitiesResponse = await response.json();
        setActivities(data.activities);
        setSummary(data.summary);
        setPagination(data.pagination);
        setChallengeProfile(
          data.challengeProfile &&
            typeof data.challengeProfile === "object" &&
            data.challengeProfile.mode
            ? data.challengeProfile
            : null
        );
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [
    userId,
    timeRange,
    startDate,
    endDate,
    eventType,
    context,
    skill,
    status,
    hasScore,
    search,
    pagination.page,
  ]);

  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams();

      if (timeRange === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      } else if (timeRange !== "all") {
        const now = new Date();
        let start: Date;

        switch (timeRange) {
          case "7days":
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30days":
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "thismonth":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "lastmonth":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            params.append("endDate", end.toISOString().split("T")[0]);
            break;
          default:
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        if (timeRange !== "lastmonth") {
          params.append("startDate", start.toISOString().split("T")[0]);
        }
      }

      if (eventType) params.append("eventType", eventType);
      if (context) params.append("context", context);
      if (skill) params.append("skill", skill);
      if (status) params.append("status", status);
      if (hasScore) params.append("hasScore", hasScore);
      if (search) params.append("search", search);

      const response = await fetch(
        `/api/admin/users/${userId}/export?${params}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `user-${userId}-activity-export.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "practice_attempt_started":
      case "practice_attempt_completed":
        return <MenuBook className="w-4 h-4" />;
      case "mock_attempt_started":
      case "mock_attempt_completed":
        return <Description className="w-4 h-4" />;
      case "ai_feedback_generated":
        return <Psychology className="w-4 h-4" />;
      case "learning_attempt_started":
        return <Insights className="w-4 h-4" />;
      case "login":
      case "logout":
        return <People className="w-4 h-4" />;
      case "payment_successful":
      case "payment_failed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Insights className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <HighlightOff className="w-4 h-4 text-red-500" />;
      case "abandoned":
        return <Warning className="w-4 h-4 text-yellow-500" />;
      default:
        return <Schedule className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              User Activity: {userId.slice(0, 8)}...
            </h1>
            <p className="text-gray-600">Detailed activity log and analytics</p>
          </div>
          <button
            onClick={exportToExcel}
            className="flex cursor-pointer items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {challengeProfile ? (
        <div className="mb-6 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-indigo-950">Final-offer refund challenge</h2>
            <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
              {challengeProfile.status ?? "unknown"}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="font-medium text-slate-500">Target CLB</dt>
              <dd className="font-semibold text-slate-900">
                {challengeProfile.targetClb ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Window</dt>
              <dd className="font-semibold text-slate-900">
                {challengeProfile.windowDays != null ? `${challengeProfile.windowDays} days` : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Refund tier</dt>
              <dd className="font-semibold text-slate-900">
                {challengeProfile.refundPercent != null
                  ? `Up to ${challengeProfile.refundPercent}%`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Offer source</dt>
              <dd className="font-mono text-xs font-semibold text-slate-900">
                {challengeProfile.offerSource ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Tier key</dt>
              <dd className="font-mono text-xs font-semibold text-slate-900">
                {challengeProfile.tierKey ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Deadline</dt>
              <dd className="font-semibold text-slate-900">
                {challengeProfile.deadlineAt
                  ? formatDate(
                      typeof challengeProfile.deadlineAt === "string"
                        ? challengeProfile.deadlineAt
                        : String(challengeProfile.deadlineAt)
                    )
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MenuBook className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Practice</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.practiceAttempted} / {summary.practiceCompleted}
              </p>
              <p className="text-xs text-gray-500">
                {summary.practiceAttempted > 0
                  ? Math.round(
                    (summary.practiceCompleted / summary.practiceAttempted) *
                    100
                  )
                  : 0}
                % completion
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Description className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Exams</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.mockAttempted} / {summary.mockCompleted}
              </p>
              <p className="text-xs text-gray-500">
                {summary.mockAttempted > 0
                  ? Math.round(
                    (summary.mockCompleted / summary.mockAttempted) * 100
                  )
                  : 0}
                % completion
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Psychology className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">LLM Tokens</p>
              <p className="text-2xl font-bold text-gray-900">
                {(
                  summary.practiceTokens +
                  summary.mockTokens +
                  summary.learningTokens
                ).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                P: {summary.practiceTokens.toLocaleString()} | M:{" "}
                {summary.mockTokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Schedule className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Active</p>
              <p className="text-lg font-bold text-gray-900">
                {summary.lastActive ? formatDate(summary.lastActive) : "Never"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="thismonth">This month</option>
              <option value="lastmonth">Last month</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          {timeRange === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              <option value="practice_attempt_started,practice_attempt_completed">
                Practice
              </option>
              <option value="mock_attempt_started,mock_attempt_completed">
                Exams
              </option>
              <option value="ai_feedback_generated">AI Feedback</option>
              <option value="login,logout">Authentication</option>
              <option value="payment_successful,payment_failed">
                Payments
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context
            </label>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Contexts</option>
              <option value="practice">Practice</option>
              <option value="mock">Exams</option>
              <option value="learning">Learning</option>
              <option value="system">System</option>
              <option value="payment">Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skill
            </label>
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Skills</option>
              <option value="Listening">Listening</option>
              <option value="Reading">Reading</option>
              <option value="Writing">Writing</option>
              <option value="Speaking">Speaking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="started">Started</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Has Score
            </label>
            <select
              value={hasScore}
              onChange={(e) => setHasScore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by ID, content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading activities...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Context
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skill
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr key={activity._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(activity.timestampUtc)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getEventIcon(activity.eventType)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {activity.eventType.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.context}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.skill || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(activity.status)}
                          <span className="ml-2 text-sm text-gray-900">
                            {activity.status || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.scoreOverall
                          ? activity.scoreOverall.toFixed(1)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(
                          activity.llmTokensPrompt +
                          activity.llmTokensCompletion
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.ipAddress || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {activity.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={pagination.page >= pagination.totalPages}
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
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.totalCount
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">{pagination.totalCount}</span>{" "}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          page: pagination.page - 1,
                        })
                      }
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          page: pagination.page + 1,
                        })
                      }
                      disabled={pagination.page >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
