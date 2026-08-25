"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Download, Eye, RotateCw, CreditCard, Ban } from "lucide-react";
import {
  hasPaidPracticeAccess,
  formatPlanLabel,
} from "@/lib/subscriptionAccess";
import ChangeUserPlanModal from "@/components/cms/ChangeUserPlanModal";

interface User {
  userId: string;
  email?: string;
  lastActivity: string | null;
  firstActivity: string;
  createdAt?: string;
  subscriptionStartDate?: string | null;
  purchaseDate?: string | null;
  totalActivities: number;
  uniqueIpAddresses: number;
  uniqueUserAgents: number;
  totalTokens: number;
  practiceAttempts: number;
  practiceCompletions: number;
  mockAttempts: number;
  mockCompletions: number;
  paymentEvents: number;
  disputeEvents: number;
  riskScore: number;
  ipAddresses: string[];
  userAgents: string[];
  plan?: string;
  planType?: string;
  planCancelled?: boolean;
  planExpiresAt?: string | null;
  subscriptionStatus?: "active" | "canceling" | "unsubscribed" | "never";
  stripeSubscriptionActive?: boolean;
  planSource?: string | null;
  googlePlaySubscriptionActive?: boolean;
}

interface PlanOption {
  id: string;
  title: string;
  planTitle: string;
  price: string;
  isActive: boolean;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

const CURRENT_PAID_VALUE = "__current_paid__";

function planIdOf(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && "$oid" in (raw as object)) {
    return String((raw as { $oid: string }).$oid);
  }
  return String(raw);
}

function resolvePlanSelectValue(user: User, plans: PlanOption[]): string {
  if (!hasPaidPracticeAccess(user.plan) && !user.stripeSubscriptionActive) {
    return "free";
  }

  const type = (user.planType || "").trim().toLowerCase();
  if (type) {
    const exact = plans.find(
      (p) =>
        p.title.trim().toLowerCase() === type ||
        p.planTitle.trim().toLowerCase() === type,
    );
    if (exact) return exact.id;

    const loose = plans.find((p) => {
      const title = p.title.trim().toLowerCase();
      const planTitle = p.planTitle.trim().toLowerCase();
      return (
        (title && type.includes(title)) ||
        (planTitle && type.includes(planTitle)) ||
        (title && title.includes(type)) ||
        (planTitle && planTitle.includes(type))
      );
    });
    if (loose) return loose.id;
  }

  // Paid access / live Stripe with no matching catalog row — keep a distinct
  // value so the select does not fall back to visually showing "Free".
  return CURRENT_PAID_VALUE;
}

function isGooglePlayUser(user: User): boolean {
  if (user.googlePlaySubscriptionActive) return true;
  return String(user.planSource || "")
    .trim()
    .toLowerCase()
    .startsWith("google_play");
}

function billingBadges(user: User): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = [];
  if (user.stripeSubscriptionActive) {
    badges.push({
      label: "Stripe",
      className: "bg-indigo-100 text-indigo-800",
    });
  }
  if (isGooglePlayUser(user)) {
    badges.push({
      label: "Google Play",
      className: "bg-emerald-100 text-emerald-800",
    });
  }
  const source = String(user.planSource || "").toLowerCase();
  if (source.startsWith("apple")) {
    badges.push({
      label: "Apple",
      className: "bg-slate-200 text-slate-800",
    });
  }
  if (
    badges.length === 0 &&
    (hasPaidPracticeAccess(user.plan) || user.stripeSubscriptionActive)
  ) {
    badges.push({
      label: "App",
      className: "bg-purple-100 text-purple-800",
    });
  }
  return badges;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("lastActivity");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [planModalUser, setPlanModalUser] = useState<{
    userId: string;
    label: string;
  } | null>(null);
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState("all");
  const [updatingPlanUserId, setUpdatingPlanUserId] = useState<string | null>(
    null,
  );
  const [planUpdateError, setPlanUpdateError] = useState<string | null>(null);
  const [cancelingPlayUserId, setCancelingPlayUserId] = useState<string | null>(
    null,
  );

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/plans");
      if (!response.ok) return;
      const data = await response.json();
      const plans = (data.plans || []) as Array<{
        _id?: unknown;
        title?: string;
        planTitle?: string;
        price?: string;
        isActive?: boolean;
      }>;
      setPlanOptions(
        plans
          .map((p) => ({
            id: planIdOf(p._id),
            title: p.title || "",
            planTitle: p.planTitle || "",
            price: String(p.price ?? ""),
            isActive: Boolean(p.isActive),
          }))
          .filter((p) => p.id && p.isActive),
      );
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search: debouncedSearch,
        sortBy,
        sortOrder,
        subscriptionStatus,
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data: UsersResponse = await response.json();

        // Guard against duplicate userIds (duplicate profile rows) breaking React keys.
        const seen = new Set<string>();
        const uniqueUsers = data.users.filter((u) => {
          if (!u.userId || seen.has(u.userId)) return false;
          seen.add(u.userId);
          return true;
        });
        setUsers(uniqueUsers);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const skipSearchPageReset = useRef(true);
  useEffect(() => {
    if (skipSearchPageReset.current) {
      skipSearchPageReset.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional refetch on list controls
  }, [page, debouncedSearch, sortBy, sortOrder, subscriptionStatus, pageSize]);

  const handleInlinePlanChange = async (user: User, target: string) => {
    if (target === CURRENT_PAID_VALUE) return;
    const current = resolvePlanSelectValue(user, planOptions);
    if (target === current) return;

    setPlanUpdateError(null);
    setUpdatingPlanUserId(user.userId);

    const selectedPlan =
      target === "free"
        ? null
        : planOptions.find((p) => p.id === target) || null;
    const previous = {
      plan: user.plan,
      planType: user.planType,
      planCancelled: user.planCancelled,
      subscriptionStatus: user.subscriptionStatus,
    };
    const nextStatus =
      target === "free"
        ? user.subscriptionStatus === "never"
          ? ("never" as const)
          : ("unsubscribed" as const)
        : ("active" as const);

    setUsers((prev) =>
      prev.map((u) =>
        u.userId === user.userId
          ? {
              ...u,
              plan: target === "free" ? "free" : "plus",
              planType: selectedPlan?.title || "",
              planCancelled: false,
              subscriptionStatus: nextStatus,
            }
          : u,
      ),
    );

    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(user.userId)}/plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target,
            timing: "immediate",
            mode: "entitlements_only",
            refundLatestPayment: false,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to update plan");
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === user.userId
            ? {
                ...u,
                plan: data.targetPlan || (target === "free" ? "free" : "plus"),
                planType: data.targetPlanType || selectedPlan?.title || "",
                planCancelled: false,
                subscriptionStatus: nextStatus,
              }
            : u,
        ),
      );
    } catch (error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === user.userId
            ? {
                ...u,
                plan: previous.plan,
                planType: previous.planType,
                planCancelled: previous.planCancelled,
                subscriptionStatus: previous.subscriptionStatus,
              }
            : u,
        ),
      );
      setPlanUpdateError(
        error instanceof Error ? error.message : "Failed to update plan",
      );
    } finally {
      setUpdatingPlanUserId(null);
    }
  };

  const handleCancelGooglePlay = async (user: User) => {
    const ok = window.confirm(
      `Cancel Google Play for ${user.email || user.userId}?\n\nThis stops auto-renew in Play. The user keeps Plus until the current period ends.`,
    );
    if (!ok) return;
    setPlanUpdateError(null);
    setCancelingPlayUserId(user.userId);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(user.userId)}/google-play/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revokeAccess: false }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel Google Play");
      }
      await fetchUsers();
    } catch (error) {
      setPlanUpdateError(
        error instanceof Error
          ? error.message
          : "Failed to cancel Google Play subscription",
      );
    } finally {
      setCancelingPlayUserId(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "Never";
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRowSubscriptionClass = (user: User) => {
    // Color from actual plan access / live Stripe so it can't disagree with billing.
    if (hasPaidPracticeAccess(user.plan) || user.stripeSubscriptionActive) {
      return user.planCancelled
        ? "bg-yellow-50 hover:bg-yellow-100/80"
        : "bg-green-50 hover:bg-green-100/80";
    }
    if (
      user.subscriptionStatus === "unsubscribed" ||
      user.subscriptionStatus === "canceling"
    ) {
      return "bg-red-50 hover:bg-red-100/80";
    }
    return "hover:bg-gray-50";
  };

  const exportUserData = async (identifier: string) => {
    try {
      const response = await fetch(`/api/admin/users/${identifier}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safe = identifier.includes("@")
          ? identifier.split("@")[0]
          : identifier;
        a.href = url;
        a.download = `user-${safe}-activity-export.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting user data:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          User Management
        </h1>
        <p className="text-gray-600">
          Monitor user activity and prevent fraud/disputes
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-green-400" />
            Active subscription
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-yellow-400" />
            Canceled, access until period end
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
            Canceled subscription
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-gray-300 bg-white" />
            Free
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800">
              Stripe
            </span>
            Billed in Stripe
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
              Google Play
            </span>
            Billed in Play
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by User ID, Email, IP, or User Agent..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={subscriptionStatus}
              onChange={(e) => {
                setSubscriptionStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              title="Filter by subscription status"
            >
              <option value="all">All statuses</option>
              <option value="never">Free</option>
              <option value="active">Stripe</option>
              <option value="google_play">Google Play</option>
              <option value="app_paid">App paid access</option>
              <option value="canceled">Canceled</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Register Date</option>
              <option value="lastActivity">
                Last Activity (practice/mock/login)
              </option>
              <option value="totalTokens">Tokens</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <button
              onClick={fetchUsers}
              className="p-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Refresh"
            >
              <RotateCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {planUpdateError ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {planUpdateError}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setPlanUpdateError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Practice / Exams
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens / Devices
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      title="Latest practice, mock, or login event"
                    >
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr
                      key={user.userId}
                      className={getRowSubscriptionClass(user)}
                    >
                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{user.email ?? "-"}</div>
                        <div className="text-xs text-gray-500">
                          {user.createdAt || user.firstActivity
                            ? `Registered ${formatDate(user.createdAt || user.firstActivity)}`
                            : "Registered —"}
                        </div>
                        {user.subscriptionStartDate || user.purchaseDate ? (
                          <div className="text-xs text-gray-500">
                            Subscribed{" "}
                            {formatDate(
                              user.subscriptionStartDate ||
                                user.purchaseDate ||
                                "",
                            )}
                          </div>
                        ) : null}
                      </td>

                      {/* Plan Type */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select
                          value={resolvePlanSelectValue(user, planOptions)}
                          disabled={
                            updatingPlanUserId === user.userId ||
                            planOptions.length === 0
                          }
                          onChange={(e) =>
                            handleInlinePlanChange(user, e.target.value)
                          }
                          title="Change app access (does not affect Stripe)"
                          className={`max-w-[11rem] rounded-md border px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                            hasPaidPracticeAccess(user.plan) ||
                            user.stripeSubscriptionActive
                              ? "border-purple-200 bg-purple-50 text-purple-800"
                              : "border-gray-200 bg-gray-50 text-gray-800"
                          }`}
                        >
                          <option value="free">Free</option>
                          {resolvePlanSelectValue(user, planOptions) ===
                          CURRENT_PAID_VALUE ? (
                            <option value={CURRENT_PAID_VALUE}>
                              {user.stripeSubscriptionActive &&
                              !hasPaidPracticeAccess(user.plan)
                                ? "Stripe active (app plan free)"
                                : formatPlanLabel(user.plan, user.planType)}
                            </option>
                          ) : null}
                          {planOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                              {p.planTitle ? ` (${p.planTitle})` : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {billingBadges(user).length > 0 ? (
                            billingBadges(user).map((badge) => (
                              <span
                                key={badge.label}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Practice / Exams */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          Practice: {user.practiceAttempts} /{" "}
                          {user.practiceCompletions}
                          <span className="ml-1 text-xs text-gray-500">
                            (
                            {user.practiceAttempts > 0
                              ? Math.round(
                                  (user.practiceCompletions /
                                    user.practiceAttempts) *
                                    100,
                                )
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Exams: {user.mockAttempts} / {user.mockCompletions}
                          <span className="ml-1">
                            (
                            {user.mockAttempts > 0
                              ? Math.round(
                                  (user.mockCompletions / user.mockAttempts) *
                                    100,
                                )
                              : 0}
                            %)
                          </span>
                        </div>
                      </td>

                      {/* Tokens / Devices */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{user.totalTokens.toLocaleString()} tokens</div>
                        <div className="text-xs text-gray-500">
                          {user.uniqueIpAddresses} IPs · {user.uniqueUserAgents}{" "}
                          devices
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.lastActivity)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              window.open(
                                `/cms/dashboard/users/${user.userId}`,
                                "_blank",
                              )
                            }
                            className="text-blue-600 cursor-pointer hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setPlanModalUser({
                                userId: user.userId,
                                label:
                                  user.email ||
                                  formatPlanLabel(user.plan, user.planType),
                              })
                            }
                            className="text-purple-600 cursor-pointer hover:text-purple-900"
                            title="Change Plan"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          {isGooglePlayUser(user) &&
                          hasPaidPracticeAccess(user.plan) &&
                          !user.planCancelled ? (
                            <button
                              onClick={() => handleCancelGooglePlay(user)}
                              disabled={cancelingPlayUserId === user.userId}
                              className="text-red-600 cursor-pointer hover:text-red-900 disabled:opacity-50"
                              title="Cancel Google Play subscription"
                            >
                              <Ban
                                className={`w-4 h-4 ${
                                  cancelingPlayUserId === user.userId
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                            </button>
                          ) : null}
                          <button
                            onClick={() => exportUserData(user.userId)}
                            className="text-green-600 cursor-pointer hover:text-green-900"
                            title="Export Data"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 cursor-pointer flex justify-between sm:hidden">
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
                  className="ml-3 cursor-pointer relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="relative cursor-pointer inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      className="relative cursor-pointer  inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {planModalUser ? (
        <ChangeUserPlanModal
          open
          userId={planModalUser.userId}
          userLabel={planModalUser.label}
          onClose={() => setPlanModalUser(null)}
          onSuccess={() => fetchUsers()}
        />
      ) : null}
    </div>
  );
}
