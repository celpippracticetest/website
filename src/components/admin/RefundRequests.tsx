"use client";

import { Box } from "@/components/ui/Box";
import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

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
            <table className="w-full min-w-[1080px]">
              <thead className="border-b bg-[#F9FAFB]">
                <tr>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Tracking</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">User</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Email</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Status</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Reason</th>
                  <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">Details</th>
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
                  requests.map((item) => (
                    <tr key={item._id} className="border-b last:border-b-0">
                      <td className="px-[12px] py-[10px] text-[12px] font-semibold text-[#1F2937]">
                        {item.trackingCode}
                      </td>
                      <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.fullName}</td>
                      <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.email}</td>
                      <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.status}</td>
                      <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.reason}</td>
                      <td className="max-w-[320px] px-[12px] py-[10px] text-[13px] text-[#1F2937]">
                        <Box className="line-clamp-3">{item.details}</Box>
                        {item.status === "rejected" && (
                          <Box className="mt-[6px] rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-[8px] text-[12px] text-[#991B1B]">
                            <p>
                              Reject reason:{" "}
                              {item.rejectionReason
                                ? REJECTION_REASON_LABELS[item.rejectionReason] ||
                                  item.rejectionReason
                                : "not provided"}
                            </p>
                            {item.rejectionMessage ? <p>Note: {item.rejectionMessage}</p> : null}
                          </Box>
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
                  ))
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
