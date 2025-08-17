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

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/withdrawal-requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data);
      }
    } catch (error) {
      console.error("Failed to load withdrawal requests:", error);
    } finally {
      setLoading(false);
    }
  };

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
        await loadRequests(); // Reload the list
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
                {requests.map((request) => (
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === "pending" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              updateRequestStatus(request.id, "approved")
                            }
                            disabled={updating === request.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {updating === request.id
                              ? "Updating..."
                              : "Approve"}
                          </button>
                          <button
                            onClick={() =>
                              updateRequestStatus(request.id, "paid")
                            }
                            disabled={updating === request.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {updating === request.id
                              ? "Updating..."
                              : "Mark Paid"}
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt("Enter rejection reason:");
                              if (notes !== null) {
                                updateRequestStatus(
                                  request.id,
                                  "rejected",
                                  notes
                                );
                              }
                            }}
                            disabled={updating === request.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {updating === request.id ? "Updating..." : "Reject"}
                          </button>
                        </div>
                      )}
                      {request.status === "approved" && (
                        <button
                          onClick={() =>
                            updateRequestStatus(request.id, "paid")
                          }
                          disabled={updating === request.id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          {updating === request.id
                            ? "Updating..."
                            : "Mark Paid"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {requests.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">No withdrawal requests found</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
