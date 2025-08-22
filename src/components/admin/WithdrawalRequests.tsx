"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  paypalEmail: string;
  status: "pending" | "approved" | "paid" | "rejected";
  userEmail: string;
  referralStats: {
    totalInvitees: number;
    totalReward: number;
    referralCode: string;
  };
  planPurchased: string;
  purchaseDate: string;
  adminNotes?: string;
  createdAt: string;
}

export default function WithdrawalRequests() {
  const { user } = useUser();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "paid" | "rejected"
  >("pending");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async (
    status: "all" | "pending" | "approved" | "paid" | "rejected" = statusFilter
  ) => {
    try {
      setLoading(true);
      const qs =
        status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
      const response = await fetch(`/api/admin/withdrawal-requests${qs}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data?.data) ? data.data : []);
      } else {
        // fallback: keep previous requests
        console.error(
          "Failed to load requests with status:",
          status,
          response.status
        );
      }
    } catch (error) {
      console.error("Failed to load withdrawal requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateRequestStatus = async (
    requestId: string,
    status: string,
    adminNotes?: string
  ) => {
    try {
      setUpdating(requestId);
      const response = await fetch("/api/admin/withdrawal-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status, adminNotes }),
      });

      if (response.ok) {
        const updated = await response.json();
        const updatedReq = updated?.data;
        if (updatedReq?.id) {
          setRequests((prev) =>
            prev.map((r) =>
              r.id === updatedReq.id ? { ...r, ...updatedReq } : r
            )
          );
        } else {
          // fallback
          await loadRequests(statusFilter);
        }
      } else {
        const error = await response.json();
        alert(`Failed to update: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to update request:", error);
      alert("Failed to update request");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading withdrawal requests...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Please sign in to access admin panel</div>
      </div>
    );
  }

  const displayed =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">
              Withdrawal Requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage user withdrawal requests for referral rewards
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center justify-between px-6 py-3">
            <div
              className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden"
              role="tablist"
              aria-label="Filter by status"
            >
              {(
                [
                  { key: "pending", label: "Pending" },
                  { key: "paid", label: "Paid" },
                  { key: "rejected", label: "Rejected" },
                  { key: "all", label: "All" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-3 py-1.5 text-sm font-medium border-r last:border-r-0 transition-colors ${
                    statusFilter === t.key
                      ? "bg-gray-100 text-gray-900"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => loadRequests(statusFilter)}
              className="cursor-pointer text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PayPal Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referral Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayed.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.userEmail}
                        </div>
                        <div className="text-sm text-gray-500">
                          Plan: {request.planPurchased}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${request.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.paypalEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>Code: {request.referralStats.referralCode}</div>
                        <div>
                          Invitees: {request.referralStats.totalInvitees}
                        </div>
                        <div>
                          Total Reward: $
                          {request.referralStats.totalReward.toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "approved"
                            ? "bg-blue-100 text-blue-800"
                            : request.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {request.status}
                      </span>
                      {request.status === "rejected" && request.adminNotes ? (
                        <div className="mt-1 text-xs text-red-700">
                          Reason: {request.adminNotes}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {/* Pending: approve, mark paid, reject */}
                      {request.status === "pending" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              updateRequestStatus(request.id, "paid")
                            }
                            disabled={updating === request.id}
                            className="cursor-pointer text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {updating === request.id
                              ? "Updating..."
                              : "Mark Paid"}
                          </button>
                          <button
                            onClick={() => {
                              const notes = window.prompt(
                                "Enter rejection reason:"
                              );
                              if (notes && notes.trim()) {
                                updateRequestStatus(
                                  request.id,
                                  "rejected",
                                  notes.trim()
                                );
                              }
                            }}
                            disabled={updating === request.id}
                            className="cursor-pointer text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {updating === request.id ? "Updating..." : "Reject"}
                          </button>
                        </div>
                      )}

                      {/* Approved: mark paid or reject */}
                      {request.status === "approved" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              updateRequestStatus(request.id, "paid")
                            }
                            disabled={updating === request.id}
                            className="cursor-pointer text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {updating === request.id
                              ? "Updating..."
                              : "Mark Paid"}
                          </button>
                          <button
                            onClick={() => {
                              const notes = window.prompt(
                                "Enter rejection reason:"
                              );
                              if (notes && notes.trim()) {
                                updateRequestStatus(
                                  request.id,
                                  "rejected",
                                  notes.trim()
                                );
                              }
                            }}
                            disabled={updating === request.id}
                            className="cursor-pointer text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {updating === request.id ? "Updating..." : "Reject"}
                          </button>
                        </div>
                      )}

                      {/* Rejected: allow reopen or mark paid */}
                      {request.status === "rejected" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              updateRequestStatus(request.id, "pending")
                            }
                            disabled={updating === request.id}
                            className="cursor-pointer text-gray-700 hover:text-gray-900 disabled:opacity-50"
                          >
                            {updating === request.id
                              ? "Updating..."
                              : "Reopen (Pending)"}
                          </button>
                          <button
                            onClick={() =>
                              updateRequestStatus(request.id, "paid")
                            }
                            disabled={updating === request.id}
                            className="cursor-pointer text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {updating === request.id
                              ? "Updating..."
                              : "Mark Paid"}
                          </button>
                        </div>
                      )}

                      {/* Paid: allow correction to pending or rejected */}
                      {request.status === "paid" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              updateRequestStatus(request.id, "pending")
                            }
                            disabled={updating === request.id}
                            className="cursor-pointer text-gray-700 hover:text-gray-900 disabled:opacity-50"
                          >
                            {updating === request.id
                              ? "Updating..."
                              : "Mark Pending"}
                          </button>
                          <button
                            onClick={() => {
                              const notes = window.prompt(
                                "Enter rejection reason:"
                              );
                              if (notes && notes.trim()) {
                                updateRequestStatus(
                                  request.id,
                                  "rejected",
                                  notes.trim()
                                );
                              }
                            }}
                            disabled={updating === request.id}
                            className="cursor-pointer text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {updating === request.id ? "Updating..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {displayed.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                No {statusFilter === "all" ? "" : statusFilter + " "}withdrawal
                requests found
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
