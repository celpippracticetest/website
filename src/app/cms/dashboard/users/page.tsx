"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Eye,
  AlertTriangle,
  Shield,
  Clock,
  RotateCw,
} from "lucide-react";
import { Box } from "@/components/ui/Box";
import {
  Typography,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Pagination,
} from "@mui/material";

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
  totalSpend?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  subscriptionStatus?: "active" | "unsubscribed" | "never";
  subscriptionDurationDays?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
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
  const [sortBy, setSortBy] = useState("lastActivity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [subscriptionStatus, setSubscriptionStatus] = useState("all");
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
        subscriptionStatus,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, sortBy, sortOrder, subscriptionStatus]);

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
        const safe = identifier.includes("@") ? identifier.split("@")[0] : identifier;
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

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box className="p-6">
      {/* Header */}
      <Box className="mb-6">
        <Typography variant="h4" component="h1" className="font-bold text-gray-900 mb-1">
          User Management
        </Typography>
        <Typography variant="body2" className="text-gray-600">
          Monitor user activity and prevent fraud/disputes
        </Typography>
      </Box>

      {/* Search & Filters */}
      <Paper
        elevation={0}
        className="mb-6 border"
        sx={{ borderRadius: 2, p: 2.5 }}
      >
        <Box className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Box className="flex-1">
            <TextField
              fullWidth
              placeholder="Search by User ID, Email, IP, or User Agent..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-4 h-4 text-gray-400" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box className="flex flex-wrap gap-2">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Plan Status</InputLabel>
              <Select
                label="Plan Status"
                value={subscriptionStatus}
                onChange={(e) => {
                  setPage(1);
                  setSubscriptionStatus(e.target.value);
                }}
              >
                <MenuItem value="all">All Users</MenuItem>
                <MenuItem value="active">Active Plan</MenuItem>
                <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
                <MenuItem value="never">Never Subscribed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                label="Sort By"
                value={sortBy}
                onChange={(e) => {
                  setPage(1);
                  setSortBy(e.target.value);
                }}
              >
                <MenuItem value="createdAt">First Activity</MenuItem>
                <MenuItem value="lastActivity">Last Activity</MenuItem>
                <MenuItem value="totalActivities">Total Activities</MenuItem>
                <MenuItem value="riskScore">Risk Score</MenuItem>
                <MenuItem value="plan">Plan (Premium)</MenuItem>
                <MenuItem value="totalSpend">Total Spend</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Order</InputLabel>
              <Select
                label="Order"
                value={sortOrder}
                onChange={(e) => {
                  setPage(1);
                  setSortOrder(e.target.value as "asc" | "desc");
                }}
              >
                <MenuItem value="desc">Descending</MenuItem>
                <MenuItem value="asc">Ascending</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Refresh">
              <span>
                <IconButton
                  onClick={fetchUsers}
                  size="small"
                  disabled={loading}
                  className="border border-gray-300"
                >
                  <RotateCw
                    className={`w-5 h-5 text-gray-600 ${loading ? "animate-spin" : ""}`}
                  />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Users Table */}
      <Paper elevation={0} className="border overflow-hidden">
        {loading ? (
          <Box className="p-8 text-center flex flex-col items-center justify-center">
            <CircularProgress color="primary" size={32} />
            <Typography variant="body2" className="mt-2 text-gray-600">
              Loading users...
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 640 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Risk Score</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Activities</TableCell>
                    <TableCell>Practice</TableCell>
                    <TableCell>Exams</TableCell>
                    <TableCell>Tokens</TableCell>
                    <TableCell>IPs / Devices</TableCell>
                    <TableCell>Last Active</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.userId} hover>
                      {/* Email */}
                      <TableCell>
                        <Typography variant="body2">
                          {user.email ?? "-"}
                        </Typography>
                      </TableCell>

                      {/* Risk Score */}
                      <TableCell>
                        <Box
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(
                            user.riskScore
                          )}`}
                        >
                          {getRiskIcon(user.riskScore)}
                          <span className="ml-1">{user.riskScore}%</span>
                        </Box>
                      </TableCell>

                      {/* Plan */}
                      <TableCell>
                        <Box className="flex flex-col items-start gap-0.5">
                          <Chip
                            size="small"
                            label={
                              user.plan === "premium" || user.plan === "pro"
                                ? `Premium${user.planType ? ` (${user.planType})` : ""}`
                                : "Free"
                            }
                            color={
                              user.plan === "premium" || user.plan === "pro"
                                ? "secondary"
                                : "default"
                            }
                            variant="outlined"
                          />
                          {user.subscriptionStatus === "unsubscribed" && (
                            <Typography
                              variant="caption"
                              className="text-red-600 font-medium"
                            >
                              Unsubscribed · {user.subscriptionDurationDays} days
                            </Typography>
                          )}
                          {user.subscriptionStatus === "active" &&
                            (user.subscriptionDurationDays || 0) > 0 && (
                              <Typography
                                variant="caption"
                                className="text-green-600 font-medium"
                              >
                                Active · {user.subscriptionDurationDays} days
                              </Typography>
                            )}
                        </Box>
                      </TableCell>

                      {/* Revenue */}
                      <TableCell>
                        <Typography variant="body2">
                          ${(user.totalSpend || 0).toFixed(2)}
                        </Typography>
                      </TableCell>

                      {/* Source */}
                      <TableCell>
                        <Box className="flex flex-col max-w-[180px]">
                          {user.utm_source ? (
                            <>
                              <Typography
                                variant="body2"
                                className="font-medium text-gray-900"
                              >
                                {user.utm_source}
                              </Typography>
                              {user.utm_medium && (
                                <Typography
                                  variant="caption"
                                  className="text-gray-500"
                                >
                                  {user.utm_medium}
                                </Typography>
                              )}
                              {user.utm_campaign && (
                                <Tooltip title={user.utm_campaign}>
                                  <Typography
                                    variant="caption"
                                    noWrap
                                    className="text-gray-400"
                                  >
                                    {user.utm_campaign}
                                  </Typography>
                                </Tooltip>
                              )}
                            </>
                          ) : (
                            <Typography variant="caption" className="text-gray-400">
                              -
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Activities */}
                      <TableCell>
                        <Typography variant="body2">
                          {user.totalActivities.toLocaleString()}
                        </Typography>
                      </TableCell>

                      {/* Practice */}
                      <TableCell>
                        <Typography variant="body2">
                          {user.practiceAttempts} / {user.practiceCompletions}
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                          {user.practiceAttempts > 0
                            ? Math.round(
                                (user.practiceCompletions /
                                  user.practiceAttempts) *
                                  100
                              )
                            : 0}
                          % completion
                        </Typography>
                      </TableCell>

                      {/* Exams */}
                      <TableCell>
                        <Typography variant="body2">
                          {user.mockAttempts} / {user.mockCompletions}
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                          {user.mockAttempts > 0
                            ? Math.round(
                                (user.mockCompletions / user.mockAttempts) * 100
                              )
                            : 0}
                          % completion
                        </Typography>
                      </TableCell>

                      {/* Tokens */}
                      <TableCell>
                        <Typography variant="body2">
                          {user.totalTokens.toLocaleString()}
                        </Typography>
                      </TableCell>

                      {/* IPs / Devices */}
                      <TableCell>
                        <Typography variant="body2">
                          {user.uniqueIpAddresses} IPs
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                          {user.uniqueUserAgents} devices
                        </Typography>
                      </TableCell>

                      {/* Last Active */}
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {formatDate(user.lastActivity)}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Box className="flex gap-1">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() =>
                                window.open(
                                  `/cms/dashboard/users/${user.userId}`,
                                  "_blank"
                                )
                              }
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Export Data">
                            <IconButton
                              size="small"
                              onClick={() => exportUserData(user.userId)}
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-3">
              <Typography variant="caption" className="text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {users.length === 0
                    ? 0
                    : (page - 1) * pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(page * pagination.limit, pagination.totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-medium">{pagination.totalCount}</span>{" "}
                results
              </Typography>
              <Pagination
                count={pagination.totalPages || 1}
                page={page}
                onChange={handlePageChange}
                size="small"
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}

