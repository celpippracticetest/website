"use client";

import { Box } from "@/components/ui/Box";
import { RotateCw, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState, Fragment } from "react";

type RefundRequestItem = {
  _id: string;
  trackingCode: string;
  userId: string;
  status: "pending" | "done" | "under_review" | "approved" | "rejected" | "refunded";
  fullName: string;
  email: string;
  reason: string;
  details: string;
  rejectionReason?: string;
  rejectionMessage?: string;
  createdAt: string;
  updatedAt: string;
  userActivityCount?: number;
  lastTokenUsage?: {
    timestamp: string;
    totalTokens: number;
  } | null;
};

type RefundRequestsResponse = {
  requests: RefundRequestItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "done", label: "Done" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "refunded", label: "Refunded" },
] as const;

const REJECT_REASON_OPTIONS = [
  { value: "outside_refund_window", label: "Outside refund window" },
  { value: "used_service_after_purchase", label: "Service already used" },
  { value: "duplicate_request", label: "Duplicate request" },
  { value: "insufficient_details", label: "Insufficient details" },
  { value: "other", label: "Other" },
] as const;

const REJECTION_REASON_LABELS: Record<string, string> = {
  outside_refund_window: "Outside refund window",
  used_service_after_purchase: "Service already used",
  duplicate_request: "Duplicate request",
  insufficient_details: "Insufficient details",
  other: "Other",
};

export default function RefundRequests() {
  const [requests, setRequests] = useState<RefundRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rejectDraft, setRejectDraft] = useState<
    Record<string, { reason: string; message: string }>
  >({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const performAction = async (params: {
    requestId: string;
    userId: string;
    action: "refund_last_payment" | "cancel_subscription";
  }) => {
    const actionKey = `${params.requestId}-${params.action}`;
    setActionLoading((prev) => ({ ...prev, [actionKey]: params.action }));
    setActionError((prev) => ({ ...prev, [actionKey]: "" }));
    setActionSuccess((prev) => ({ ...prev, [actionKey]: "" }));

    try {
      const res = await fetch("/api/admin/refund-requests/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: params.userId,
          action: params.action,
          requestId: params.requestId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError((prev) => ({
          ...prev,
          [actionKey]: data.error || "Action failed",
        }));
        return;
      }

      setActionSuccess((prev) => ({
        ...prev,
        [actionKey]: data.message || "Action completed successfully",
      }));

      // Refresh the requests list to show updated status
      await fetchRequests();

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setActionSuccess((prev) => {
          const newState = { ...prev };
          delete newState[actionKey];
          return newState;
        });
      }, 5000);
    } catch (error) {
      setActionError((prev) => ({
        ...prev,
        [actionKey]: "Failed to perform action",
      }));
    } finally {
      setActionLoading((prev) => {
        const newState = { ...prev };
        delete newState[actionKey];
        return newState;
      });
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        status,
      });
      const res = await fetch(`/api/admin/refund-requests?${params.toString()}`);
      if (!res.ok) {
        setRequests([]);
        return;
      }
      const data: RefundRequestsResponse = await res.json();
      setRequests(data.requests || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: 20,
          totalCount: 0,
          totalPages: 0,
        }
      );
    } catch (error) {
      console.error("Failed to fetch refund requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, status]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const updateRequestStatus = async (params: {
    requestId: string;
    status: "done" | "rejected";
    rejectionReason?: string;
    rejectionMessage?: string;
  }) => {
    setUpdatingId(params.requestId);
    setRowError((prev) => ({ ...prev, [params.requestId]: "" }));
    try {
      const res = await fetch("/api/admin/refund-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError((prev) => ({
          ...prev,
          [params.requestId]: payload?.error || "Failed to update request.",
        }));
        return;
      }
      await fetchRequests();
    } catch (error) {
      setRowError((prev) => ({
        ...prev,
        [params.requestId]: "Failed to update request.",
      }));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Box className="p-[24px]">
      <Box className="mb-[18px] flex items-center justify-between gap-[10px]">
        <Box>
          <h1 className="text-[26px] font-bold text-[#111827]">Refund Requests</h1>
          <p className="mt-[6px] text-[14px] text-[#6B7280]">
            Review all submitted refund requests from dashboard users.
          </p>
        </Box>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center justify-center rounded-[10px] border border-[#D1D5DB] p-[8px] text-[#4B5563] hover:bg-[#F9FAFB]"
          title="Refresh"
          type="button"
        >
          <RotateCw className={`h-[18px] w-[18px] ${loading ? "animate-spin" : ""}`} />
        </button>
      </Box>

      <Box className="mb-[12px] flex items-center gap-[10px]">
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-[38px] rounded-[10px] border border-[#D1D5DB] bg-white px-[10px] text-[14px]"
        >
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Box>

      <Box className="overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white">
        {loading ? (
          <Box className="p-[24px] text-center text-[14px] text-[#6B7280]">
            Loading refund requests...
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="border-b bg-[#F9FAFB]">
                <tr>
                  <th className="w-[40px] px-[12px] py-[10px]"></th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Tracking</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">User</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Status</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Activities</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Last Token Usage</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Submitted</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td className="px-[12px] py-[16px] text-center text-[14px] text-[#6B7280]" colSpan={8}>
                      No refund requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((item) => {
                    const isExpanded = expandedRows.has(item._id);
                    return (
                      <Fragment key={item._id}>
                        <tr className="border-b hover:bg-[#F9FAFB]">
                          <td className="px-[12px] py-[10px]">
                            <button
                              type="button"
                              onClick={() => toggleRow(item._id)}
                              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#374151]"
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-[16px] w-[16px]" />
                              ) : (
                                <ChevronDown className="h-[16px] w-[16px]" />
                              )}
                            </button>
                          </td>
                          <td className="px-[12px] py-[10px] text-[12px] font-semibold text-[#1F2937]">
                            {item.trackingCode}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.fullName}</td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">
                            <span
                              className={`inline-block rounded-[6px] px-[8px] py-[2px] text-[11px] font-semibold ${
                                item.status === "pending"
                                  ? "bg-[#FEF3C7] text-[#92400E]"
                                  : item.status === "done" || item.status === "refunded"
                                  ? "bg-[#D1FAE5] text-[#065F46]"
                                  : item.status === "rejected"
                                  ? "bg-[#FEE2E2] text-[#991B1B]"
                                  : "bg-[#E0E7FF] text-[#3730A3]"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">
                            <Box className="flex items-center gap-[4px]">
                              <span className="font-semibold text-[#059669]">{item.userActivityCount || 0}</span>
                              <span className="text-[#6B7280]">events</span>
                            </Box>
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">
                            {item.lastTokenUsage ? (
                              <Box className="flex flex-col gap-[2px]">
                                <Box className="flex items-center gap-[4px]">
                                  <span className="font-semibold text-[#7C3AED]">{item.lastTokenUsage.totalTokens.toLocaleString()}</span>
                                  <span className="text-[#6B7280]">tokens</span>
                                </Box>
                                <span className="text-[11px] text-[#9CA3AF]">
                                  {formatDate(item.lastTokenUsage.timestamp)}
                                </span>
                              </Box>
                            ) : (
                              <span className="text-[#9CA3AF]">No token usage</span>
                            )}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">{formatDate(item.createdAt)}</td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">
                            {item.status !== "pending" ? (
                              <span className="text-[12px] text-[#6B7280]">Resolved</span>
                            ) : (
                              <Box className="flex min-w-[240px] flex-col gap-[8px]">
                                <Box className="flex gap-[6px]">
                                  <button
                                    type="button"
                                    disabled={updatingId === item._id}
                                    onClick={() =>
                                      updateRequestStatus({
                                        requestId: item._id,
                                        status: "done",
                                      })
                                    }
                                    className="rounded-[8px] border border-[#A7F3D0] bg-[#ECFDF5] px-[8px] py-[5px] text-[12px] font-semibold text-[#065F46] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Mark Done
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingId === item._id}
                                    onClick={() => {
                                      const draft = rejectDraft[item._id];
                                      if (!draft?.reason) {
                                        setRowError((prev) => ({
                                          ...prev,
                                          [item._id]: "Select reject reason first.",
                                        }));
                                        return;
                                      }
                                      updateRequestStatus({
                                        requestId: item._id,
                                        status: "rejected",
                                        rejectionReason: draft.reason,
                                        rejectionMessage: draft.message || undefined,
                                      });
                                    }}
                                    className="rounded-[8px] border border-[#FCA5A5] bg-[#FEF2F2] px-[8px] py-[5px] text-[12px] font-semibold text-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </Box>
                                <select
                                  value={rejectDraft[item._id]?.reason || ""}
                                  onChange={(e) =>
                                    setRejectDraft((prev) => ({
                                      ...prev,
                                      [item._id]: {
                                        reason: e.target.value,
                                        message: prev[item._id]?.message || "",
                                      },
                                    }))
                                  }
                                  className="h-[32px] rounded-[8px] border border-[#D1D5DB] bg-white px-[8px] text-[12px]"
                                >
                                  <option value="">Select reject reason</option>
                                  {REJECT_REASON_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={rejectDraft[item._id]?.message || ""}
                                  onChange={(e) =>
                                    setRejectDraft((prev) => ({
                                      ...prev,
                                      [item._id]: {
                                        reason: prev[item._id]?.reason || "",
                                        message: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Optional reject note"
                                  className="h-[32px] rounded-[8px] border border-[#D1D5DB] bg-white px-[8px] text-[12px]"
                                />
                                {rowError[item._id] ? (
                                  <p className="text-[12px] text-[#B91C1C]">{rowError[item._id]}</p>
                                ) : null}
                              </Box>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b bg-[#F9FAFB]">
                            <td colSpan={8} className="px-[12px] py-[16px]">
                              <Box className="rounded-[10px] border border-[#E5E7EB] bg-white p-[20px]">
                                <h3 className="mb-[16px] text-[16px] font-semibold text-[#111827]">
                                  Request Details
                                </h3>
                                <Box className="flex flex-col gap-[16px] md:flex-row">
                                  <Box className="flex-1">
                                    <h4 className="mb-[8px] text-[13px] font-semibold text-[#374151]">
                                      User Information
                                    </h4>
                                    <Box className="space-y-[6px] rounded-[8px] bg-[#F9FAFB] p-[12px] text-[13px]">
                                      <Box className="flex gap-[8px]">
                                        <span className="font-semibold text-[#6B7280]">User ID:</span>
                                        <span className="font-mono text-[#1F2937]">{item.userId}</span>
                                      </Box>
                                      <Box className="flex gap-[8px]">
                                        <span className="font-semibold text-[#6B7280]">Full Name:</span>
                                        <span className="text-[#1F2937]">{item.fullName}</span>
                                      </Box>
                                      <Box className="flex gap-[8px]">
                                        <span className="font-semibold text-[#6B7280]">Email:</span>
                                        <span className="text-[#1F2937]">{item.email}</span>
                                      </Box>
                                    </Box>
                                  </Box>
                                  <Box className="flex-1">
                                    <h4 className="mb-[8px] text-[13px] font-semibold text-[#374151]">
                                      Refund Request
                                    </h4>
                                    <Box className="space-y-[6px] rounded-[8px] bg-[#F9FAFB] p-[12px] text-[13px]">
                                      <Box className="flex gap-[8px]">
                                        <span className="font-semibold text-[#6B7280]">Reason:</span>
                                        <span className="text-[#1F2937]">{item.reason}</span>
                                      </Box>
                                      <Box className="flex flex-col gap-[4px]">
                                        <span className="font-semibold text-[#6B7280]">Details:</span>
                                        <Box className="max-h-[120px] overflow-y-auto rounded-[6px] bg-white p-[8px] text-[#1F2937]">
                                          {item.details}
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                  <Box className="flex-1">
                                    <h4 className="mb-[8px] text-[13px] font-semibold text-[#374151]">
                                      Timestamps
                                    </h4>
                                    <Box className="space-y-[6px] rounded-[8px] bg-[#F9FAFB] p-[12px] text-[13px]">
                                      <Box className="flex gap-[8px]">
                                        <span className="font-semibold text-[#6B7280]">Created:</span>
                                        <span className="text-[#1F2937]">{formatDate(item.createdAt)}</span>
                                      </Box>
                                      <Box className="flex gap-[8px]">
                                        <span className="font-semibold text-[#6B7280]">Updated:</span>
                                        <span className="text-[#1F2937]">{formatDate(item.updatedAt)}</span>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Box>
                                {item.status === "rejected" && (
                                  <Box className="mt-[16px] rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-[12px]">
                                    <h4 className="mb-[8px] text-[13px] font-semibold text-[#991B1B]">
                                      Rejection Information
                                    </h4>
                                    <Box className="space-y-[6px] text-[13px] text-[#991B1B]">
                                      <Box className="flex gap-[8px]">
                                        <span className="font-semibold">Reason:</span>
                                        <span>
                                          {item.rejectionReason
                                            ? REJECTION_REASON_LABELS[item.rejectionReason] ||
                                              item.rejectionReason
                                            : "not provided"}
                                        </span>
                                      </Box>
                                      {item.rejectionMessage && (
                                        <Box className="flex flex-col gap-[4px]">
                                          <span className="font-semibold">Message:</span>
                                          <Box className="rounded-[6px] bg-white p-[8px]">
                                            {item.rejectionMessage}
                                          </Box>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                )}

                                <Box className="mt-[16px] rounded-[8px] border border-[#E5E7EB] bg-[#FAFBFC] p-[12px]">
                                  <h4 className="mb-[8px] text-[13px] font-semibold text-[#374151]">
                                    Admin Actions
                                  </h4>
                                  <Box className="flex flex-wrap gap-[8px]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        performAction({
                                          requestId: item._id,
                                          userId: item.userId,
                                          action: "refund_last_payment",
                                        })
                                      }
                                      disabled={!!actionLoading[`${item._id}-refund_last_payment`]}
                                      className="flex items-center gap-[6px] rounded-[8px] border border-[#A7F3D0] bg-[#ECFDF5] px-[12px] py-[6px] text-[12px] font-semibold text-[#065F46] hover:bg-[#D1FAE5] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {actionLoading[`${item._id}-refund_last_payment`] ? (
                                        <>
                                          <Box className="h-[12px] w-[12px] animate-spin rounded-full border-2 border-[#065F46] border-t-transparent" />
                                          Processing...
                                        </>
                                      ) : (
                                        "Refund Last Payment"
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        performAction({
                                          requestId: item._id,
                                          userId: item.userId,
                                          action: "cancel_subscription",
                                        })
                                      }
                                      disabled={!!actionLoading[`${item._id}-cancel_subscription`]}
                                      className="flex items-center gap-[6px] rounded-[8px] border border-[#FCA5A5] bg-[#FEF2F2] px-[12px] py-[6px] text-[12px] font-semibold text-[#991B1B] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {actionLoading[`${item._id}-cancel_subscription`] ? (
                                        <>
                                          <Box className="h-[12px] w-[12px] animate-spin rounded-full border-2 border-[#991B1B] border-t-transparent" />
                                          Processing...
                                        </>
                                      ) : (
                                        "Cancel Subscription"
                                      )}
                                    </button>
                                  </Box>
                                  {actionSuccess[`${item._id}-refund_last_payment`] && (
                                    <Box className="mt-[8px] rounded-[6px] border border-[#A7F3D0] bg-[#ECFDF5] p-[8px] text-[12px] text-[#065F46]">
                                      ✓ {actionSuccess[`${item._id}-refund_last_payment`]}
                                    </Box>
                                  )}
                                  {actionSuccess[`${item._id}-cancel_subscription`] && (
                                    <Box className="mt-[8px] rounded-[6px] border border-[#A7F3D0] bg-[#ECFDF5] p-[8px] text-[12px] text-[#065F46]">
                                      ✓ {actionSuccess[`${item._id}-cancel_subscription`]}
                                    </Box>
                                  )}
                                  {actionError[`${item._id}-refund_last_payment`] && (
                                    <Box className="mt-[8px] rounded-[6px] border border-[#FCA5A5] bg-[#FEF2F2] p-[8px] text-[12px] text-[#991B1B]">
                                      ✗ {actionError[`${item._id}-refund_last_payment`]}
                                    </Box>
                                  )}
                                  {actionError[`${item._id}-cancel_subscription`] && (
                                    <Box className="mt-[8px] rounded-[6px] border border-[#FCA5A5] bg-[#FEF2F2] p-[8px] text-[12px] text-[#991B1B]">
                                      ✗ {actionError[`${item._id}-cancel_subscription`]}
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      {pagination.totalPages > 1 ? (
        <Box className="mt-[12px] flex items-center justify-between">
          <p className="text-[13px] text-[#6B7280]">
            Showing {(page - 1) * pagination.limit + 1} -{" "}
            {Math.min(page * pagination.limit, pagination.totalCount)} of{" "}
            {pagination.totalCount}
          </p>
          <Box className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="rounded-[8px] border border-[#D1D5DB] px-[10px] py-[6px] text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
              disabled={page >= pagination.totalPages}
              className="rounded-[8px] border border-[#D1D5DB] px-[10px] py-[6px] text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
