"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Brain,
  BookOpen,
  FileText,
  Users,
} from "lucide-react";
import {
  formatPlanLabel,
  hasPaidPracticeAccess,
} from "@/lib/subscriptionAccess";
import ChangeUserPlanModal from "@/components/cms/ChangeUserPlanModal";

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

interface UserActivitiesResponse {
  activities: Activity[];
  summary: ActivitySummary;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface UserProfile {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: string;
  planType: string | null;
  planCancelled: boolean;
  planRenewsAt: string | null;
  planExpiresAt: string | null;
  purchaseDate: string | null;
  purchaseAmount: number;
  purchaseCurrency: string;
  totalSpend: number;
  stripeCustomerId: string | null;
  stripeSubscriptionActive?: boolean;
  planSource: string | null;
  billingProvider?: string | null;
  billingLabel?: string | null;
  googlePlaySubscriptionActive: boolean;
  googlePlayCanCancel: boolean;
  subscriptionStatus: "active" | "unsubscribed" | "never";
  createdAt: string;
  updatedAt: string;
}

function billingBadgeClass(provider: string | null | undefined): string {
  switch (provider) {
    case "stripe":
      return "bg-indigo-100 text-indigo-800";
    case "google_play":
      return "bg-emerald-100 text-emerald-800";
    case "apple":
      return "bg-slate-200 text-slate-800";
    case "paypal":
      return "bg-sky-100 text-sky-800";
    case "admin":
      return "bg-amber-100 text-amber-800";
    case "none":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-orange-100 text-orange-800";
  }
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
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

  // Filters — default all-time so CMS detail matches list rollups (many users are idle >7d)
  const [timeRange, setTimeRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [context, setContext] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState("");
  const [hasScore, setHasScore] = useState("");
  const [search, setSearch] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [cancelingPlay, setCancelingPlay] = useState(false);
  const [refundingPlay, setRefundingPlay] = useState(false);
  const [playCancelError, setPlayCancelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileError(null);
      try {
        const response = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}`,
        );
        if (!response.ok) {
          if (!cancelled) {
            setProfile(null);
            setProfileError(
              response.status === 404
                ? "User profile not found in database"
                : "Failed to load user profile",
            );
          }
          return;
        }
        const data: UserProfile = await response.json();
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setProfileError("Failed to load user profile");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
        `/api/admin/users/${userId}/export?${params}`,
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
        return <BookOpen className="w-4 h-4" />;
      case "mock_attempt_started":
      case "mock_attempt_completed":
        return <FileText className="w-4 h-4" />;
      case "ai_feedback_generated":
        return <Brain className="w-4 h-4" />;
      case "learning_attempt_started":
        return <Activity className="w-4 h-4" />;
      case "login":
      case "logout":
        return <Users className="w-4 h-4" />;
      case "payment_successful":
      case "payment_failed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "abandoned":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.email ||
    `${userId.slice(0, 8)}...`;

  const practicePct =
    summary.practiceAttempted > 0
      ? Math.round(
          (summary.practiceCompleted / summary.practiceAttempted) * 100,
        )
      : 0;
  const mockPct =
    summary.mockAttempted > 0
      ? Math.round((summary.mockCompleted / summary.mockAttempted) * 100)
      : 0;
  const totalTokens =
    summary.practiceTokens + summary.mockTokens + summary.learningTokens;

  const filterSelectClass =
    "w-full min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-gray-900">
            User Activity: {displayName}
          </h1>
          <p className="truncate font-mono text-xs text-gray-500">
            {profile?.userId || userId}
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <div className="shrink-0 rounded-md border bg-white px-3 py-2 shadow-sm">
        {profileError ? (
          <p className="text-sm text-red-600">{profileError}</p>
        ) : !profile ? (
          <p className="text-sm text-gray-500">Loading profile...</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <div>
              <span className="text-xs font-medium uppercase text-gray-500">
                Email{" "}
              </span>
              <span className="text-gray-900">{profile.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-gray-500">
                Plan
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  hasPaidPracticeAccess(profile.plan)
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {formatPlanLabel(profile.plan, profile.planType)}
              </span>
              {profile.planCancelled ? (
                <span className="text-xs text-amber-600">Cancelled</span>
              ) : null}
              <button
                type="button"
                onClick={() => setPlanModalOpen(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Change plan…
              </button>
              {profile.googlePlayCanCancel ||
              profile.billingProvider === "google_play" ||
              profile.googlePlaySubscriptionActive ? (
                <>
                  {hasPaidPracticeAccess(profile.plan) &&
                  !profile.planCancelled ? (
                    <button
                      type="button"
                      disabled={cancelingPlay || refundingPlay}
                      onClick={async () => {
                        const ok = window.confirm(
                          "Cancel Google Play auto-renew? The user keeps Plus until the current period ends.",
                        );
                        if (!ok) return;
                        setPlayCancelError(null);
                        setCancelingPlay(true);
                        try {
                          const response = await fetch(
                            `/api/admin/users/${encodeURIComponent(userId)}/google-play/cancel`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ revokeAccess: false }),
                            },
                          );
                          const data = await response.json().catch(() => ({}));
                          if (!response.ok) {
                            throw new Error(
                              data.error || "Failed to cancel Google Play",
                            );
                          }
                          const refreshed = await fetch(
                            `/api/admin/users/${encodeURIComponent(userId)}`,
                          );
                          if (refreshed.ok) {
                            setProfile(await refreshed.json());
                          }
                        } catch (err) {
                          setPlayCancelError(
                            err instanceof Error
                              ? err.message
                              : "Failed to cancel Google Play",
                          );
                        } finally {
                          setCancelingPlay(false);
                        }
                      }}
                      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {cancelingPlay ? "Canceling Play…" : "Cancel Google Play"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={cancelingPlay || refundingPlay}
                    onClick={async () => {
                      const ok = window.confirm(
                        "Refund the Google Play charge and set this account to Free immediately?",
                      );
                      if (!ok) return;
                      setPlayCancelError(null);
                      setRefundingPlay(true);
                      try {
                        const response = await fetch(
                          `/api/admin/users/${encodeURIComponent(userId)}/google-play/refund`,
                          { method: "POST" },
                        );
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) {
                          throw new Error(
                            data.error || "Failed to refund Google Play",
                          );
                        }
                        const refreshed = await fetch(
                          `/api/admin/users/${encodeURIComponent(userId)}`,
                        );
                        if (refreshed.ok) {
                          setProfile(await refreshed.json());
                        }
                      } catch (err) {
                        setPlayCancelError(
                          err instanceof Error
                            ? err.message
                            : "Failed to refund Google Play",
                        );
                      } finally {
                        setRefundingPlay(false);
                      }
                    }}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
                  >
                    {refundingPlay ? "Refunding Play…" : "Refund Google Play"}
                  </button>
                </>
              ) : null}
              {playCancelError ? (
                <span className="text-xs text-red-600">{playCancelError}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-gray-500">
                Billing
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${billingBadgeClass(
                  profile.billingProvider,
                )}`}
              >
                {profile.billingLabel ||
                  (profile.googlePlaySubscriptionActive
                    ? "Google Play"
                    : profile.stripeSubscriptionActive ||
                        profile.stripeCustomerId
                      ? "Stripe"
                      : hasPaidPracticeAccess(profile.plan)
                        ? "Unknown (not Stripe or Play)"
                        : "None")}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-500">
                Subscription{" "}
              </span>
              <span className="capitalize text-gray-900">
                {profile.subscriptionStatus}
              </span>
              {profile.planRenewsAt ? (
                <span className="ml-1 text-xs text-gray-500">
                  Renews {formatDate(profile.planRenewsAt)}
                </span>
              ) : null}
              {profile.planExpiresAt ? (
                <span className="ml-1 text-xs text-gray-500">
                  Expires {formatDate(profile.planExpiresAt)}
                </span>
              ) : null}
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-500">
                Spend{" "}
              </span>
              <span className="text-gray-900">
                {profile.totalSpend > 0
                  ? `${profile.totalSpend.toFixed(2)} ${profile.purchaseCurrency}`
                  : "-"}
              </span>
              {profile.purchaseDate ? (
                <span className="ml-1 text-xs text-gray-500">
                  Purchased {formatDate(profile.purchaseDate)}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <ChangeUserPlanModal
        open={planModalOpen}
        userId={userId}
        userLabel={displayName}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={() => {
          void (async () => {
            try {
              const response = await fetch(
                `/api/admin/users/${encodeURIComponent(userId)}`,
              );
              if (response.ok) {
                const data: UserProfile = await response.json();
                setProfile(data);
              }
            } catch {
              // ignore refresh errors
            }
          })();
        }}
      />

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm">
          <div className="rounded bg-blue-100 p-1.5">
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Practice</p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {summary.practiceAttempted}/{summary.practiceCompleted}
              <span className="ml-1 font-normal text-gray-500">
                ({practicePct}%)
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm">
          <div className="rounded bg-green-100 p-1.5">
            <FileText className="h-4 w-4 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Exams</p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {summary.mockAttempted}/{summary.mockCompleted}
              <span className="ml-1 font-normal text-gray-500">
                ({mockPct}%)
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm">
          <div className="rounded bg-purple-100 p-1.5">
            <Brain className="h-4 w-4 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">LLM Tokens</p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {totalTokens.toLocaleString()}
              <span className="ml-1 font-normal text-gray-500">
                P:{summary.practiceTokens.toLocaleString()} M:
                {summary.mockTokens.toLocaleString()}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm">
          <div className="rounded bg-orange-100 p-1.5">
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Last Active</p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {summary.lastActive ? formatDate(summary.lastActive) : "Never"}
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 rounded-md border bg-white px-3 py-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              Time
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className={filterSelectClass}
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
                <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
                  Start
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={filterSelectClass}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
                  End
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={filterSelectClass}
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              Event
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className={filterSelectClass}
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
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              Context
            </label>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className={filterSelectClass}
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
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              Skill
            </label>
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All Skills</option>
              <option value="Listening">Listening</option>
              <option value="Reading">Reading</option>
              <option value="Writing">Writing</option>
              <option value="Speaking">Speaking</option>
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All Status</option>
              <option value="started">Started</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              Score
            </label>
            <select
              value={hasScore}
              onChange={(e) => setHasScore(e.target.value)}
              className={filterSelectClass}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              Search
            </label>
            <input
              type="text"
              placeholder="ID, content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterSelectClass}
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-2 text-sm text-gray-600">
                Loading activities...
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 border-b bg-gray-50">
                  <tr>
                    {[
                      "Timestamp",
                      "Event",
                      "Context",
                      "Skill",
                      "Status",
                      "Score",
                      "Tokens",
                      "IP",
                      "Notes",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {activities.map((activity) => (
                    <tr key={activity._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-gray-500">
                        {formatDate(activity.timestampUtc)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <div className="flex items-center">
                          {getEventIcon(activity.eventType)}
                          <span className="ml-1.5 text-xs font-medium text-gray-900">
                            {activity.eventType.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-gray-900">
                        {activity.context}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-gray-900">
                        {activity.skill || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <div className="flex items-center">
                          {getStatusIcon(activity.status)}
                          <span className="ml-1.5 text-xs text-gray-900">
                            {activity.status || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-gray-900">
                        {activity.scoreOverall
                          ? activity.scoreOverall.toFixed(1)
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-gray-900">
                        {(
                          activity.llmTokensPrompt +
                          activity.llmTokensCompletion
                        ).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-gray-500">
                        {activity.ipAddress || "-"}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-1.5 text-xs text-gray-500">
                        {activity.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-3 py-2">
              <p className="text-xs text-gray-700">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.totalCount,
                )}{" "}
                of {pagination.totalCount}
              </p>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      page: pagination.page - 1,
                    })
                  }
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="relative inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
