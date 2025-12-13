"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Eye,
  AlertTriangle,
  Shield,
  Clock,
} from "lucide-react";

interface User {
  userId: string;
  email?: string;
  lastActivity: string;
  firstActivity: string;
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data: UsersResponse = await response.json();

        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, sortBy, sortOrder]);

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return "text-red-600 bg-red-50";
    if (riskScore >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getRiskIcon = (riskScore: number) => {
    if (riskScore >= 70) return <AlertTriangle className="w-4 h-4" />;
    if (riskScore >= 40) return <Shield className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">First Activity</option>
              <option value="lastActivity">Last Activity</option>
              <option value="totalActivities">Total Activities</option>
              <option value="riskScore">Risk Score</option>
              <option value="plan">Plan (Premium)</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                      Risk Score
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Practice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mock Exams
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IPs/Devices
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">


                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email ?? "-"}
                      </td>

                      {/* Risk Score */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(
                            user.riskScore
                          )}`}
                        >
                          {getRiskIcon(user.riskScore)}
                          <span className="ml-1">{user.riskScore}%</span>
                        </span>
                      </td>



                      {/* Plan Type */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.plan === "premium" || user.plan === "pro"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {user.plan === "premium" || user.plan === "pro"
                            ? `Premium ${user.planType ? `(${user.planType})` : ""}`
                            : "Free"}
                        </span>
                      </td>

                      {/* Activities */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.totalActivities.toLocaleString()}
                      </td>

                      {/* Practice */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {user.practiceAttempts} / {user.practiceCompletions}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.practiceAttempts > 0
                            ? Math.round(
                              (user.practiceCompletions /
                                user.practiceAttempts) *
                              100
                            )
                            : 0}
                          % completion
                        </div>
                      </td>

                      {/* Mock Exams */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {user.mockAttempts} / {user.mockCompletions}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.mockAttempts > 0
                            ? Math.round(
                              (user.mockCompletions / user.mockAttempts) * 100
                            )
                            : 0}
                          % completion
                        </div>
                      </td>

                      {/* Tokens */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.totalTokens.toLocaleString()}
                      </td>

                      {/* IPs/Devices */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{user.uniqueIpAddresses} IPs</div>
                        <div className="text-xs text-gray-500">
                          {user.uniqueUserAgents} devices
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
                                "_blank"
                              )
                            }
                            className="text-blue-600 cursor-pointer hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
    </div>
  );
}
