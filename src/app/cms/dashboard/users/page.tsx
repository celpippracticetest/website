"use client";

import { useState, useEffect, Fragment } from "react";
import Search from "@mui/icons-material/Search";
import Download from "@mui/icons-material/Download";
import Visibility from "@mui/icons-material/Visibility";
import Warning from "@mui/icons-material/Warning";
import Shield from "@mui/icons-material/Shield";
import Schedule from "@mui/icons-material/Schedule";
import Refresh from "@mui/icons-material/Refresh";
import Close from "@mui/icons-material/Close";
import Logout from "@mui/icons-material/Logout";
import People from "@mui/icons-material/People";
import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import ChevronUp from "@mui/icons-material/KeyboardArrowUp";
import MenuBook from "@mui/icons-material/MenuBook";
import Description from "@mui/icons-material/Description";
import Language from "@mui/icons-material/Language";
import Insights from "@mui/icons-material/Insights";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Collapse,
  Divider,
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
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedRevokeUser, setSelectedRevokeUser] = useState<User | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    totalClerkUsers?: number;
    totalMongoUsers?: number;
    missingUsers?: number;
  } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        sortBy,
        sortOrder,
        subscriptionStatus,
        deviceFilter,
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
  }, [page, search, sortBy, sortOrder, subscriptionStatus, deviceFilter]);

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return "text-red-600 bg-red-50";
    if (riskScore >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getRiskIcon = (riskScore: number) => {
    if (riskScore >= 70) return <Warning className="w-4 h-4" />;
    if (riskScore >= 40) return <Shield className="w-4 h-4" />;
    return <Schedule className="w-4 h-4" />;
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

  const formatPlanType = (planType?: string | null): string => {
    if (!planType) return "";
    // Capitalize first letter of each word
    return planType
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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

  const handlePageChange = (_: unknown, value: number) => {
    setPage(value);
  };

  const handleCancelSubscriptionClick = (user: User) => {
    setSelectedUser(user);
    setCancelDialogOpen(true);
  };

  const handleCancelSubscriptionConfirm = async () => {
    if (!selectedUser) return;

    setCanceling(true);
    try {
      const response = await fetch(
        `/api/admin/users/${selectedUser.userId}/cancel-subscription`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        // Refresh users list
        await fetchUsers();
        setCancelDialogOpen(false);
        setSelectedUser(null);
      } else {
        const data = await response.json();
        alert(`Failed to cancel subscription: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("Failed to cancel subscription. Please try again.");
    } finally {
      setCanceling(false);
    }
  };

  const handleCancelDialogClose = () => {
    if (!canceling) {
      setCancelDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleRevokeSessionsClick = (user: User) => {
    setSelectedRevokeUser(user);
    setRevokeDialogOpen(true);
  };

  const handleRevokeDialogClose = () => {
    if (!revoking) {
      setRevokeDialogOpen(false);
      setSelectedRevokeUser(null);
    }
  };

  const handleRevokeSessionsConfirm = async () => {
    if (!selectedRevokeUser) return;

    setRevoking(true);
    try {
      const response = await fetch(
        `/api/admin/users/${selectedRevokeUser.userId}/revoke-sessions`,
        { method: "POST" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke sessions");
      }

      const data = await response.json();
      await fetchUsers();
      setRevokeDialogOpen(false);
      setSelectedRevokeUser(null);
      alert(data.message || "All sessions revoked successfully.");
    } catch (error) {
      console.error("Error revoking sessions:", error);
      alert(error instanceof Error ? error.message : "Failed to revoke sessions.");
    } finally {
      setRevoking(false);
    }
  };

  const toggleRow = (userId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const checkSyncStatus = async () => {
    try {
      const response = await fetch("/api/admin/users/sync-missing");
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error("Error checking sync status:", error);
    }
  };

  const handleSyncAllClick = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/admin/users/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSize: 100,
          maxBatches: 50,
          forceUpdate: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh users list
        await fetchUsers();
        // Update sync status
        await checkSyncStatus();
        // Show success message
        alert(
          `Sync completed!\n\n` +
            `✅ Synced: ${data.synced} new users\n` +
            `🔄 Updated: ${data.updated} users\n` +
            `⏭️ Skipped: ${data.skipped} users\n` +
            `📊 Total processed: ${data.totalProcessed} users`
        );
        setSyncDialogOpen(false);
      } else {
        const errorData = await response.json();
        alert(`Failed to sync users: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error syncing users:", error);
      alert("Failed to sync users. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Check sync status on mount
    checkSyncStatus();
  }, []);

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

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Devices</InputLabel>
              <Select
                label="Devices"
                value={deviceFilter}
                onChange={(e) => {
                  setPage(1);
                  setDeviceFilter(e.target.value);
                }}
              >
                <MenuItem value="all">All Device Counts</MenuItem>
                <MenuItem value="gt3">More than 3 devices</MenuItem>
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
                  <Refresh
                    className={`w-5 h-5 text-gray-600 ${loading ? "animate-spin" : ""}`}
                  />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Sync All Users from Clerk">
              <span>
                <IconButton
                  onClick={() => {
                    checkSyncStatus();
                    setSyncDialogOpen(true);
                  }}
                  size="small"
                  disabled={loading || syncing}
                  className="border border-gray-300"
                >
                  <Refresh
                    className={`w-5 h-5 text-blue-600 ${syncing ? "animate-spin" : ""}`}
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
                    <TableCell width={40}></TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Risk Score</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Activities</TableCell>
                    <TableCell>Tokens</TableCell>
                    <TableCell>IPs / Devices</TableCell>
                    <TableCell>Last Active</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const isExpanded = expandedRows.has(user.userId);
                    return (
                      <Fragment key={user.userId}>
                        <TableRow hover>
                          {/* Expand/Collapse Button */}
                          <TableCell sx={{ width: 40, padding: "8px !important" }}>
                            <Tooltip title={isExpanded ? "Collapse details" : "Expand details"}>
                              <IconButton
                                size="small"
                                onClick={() => toggleRow(user.userId)}
                                sx={{
                                  padding: "4px",
                                  minWidth: "32px",
                                  minHeight: "32px",
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-700" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-700" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </TableCell>

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
                              user.plan === "premium" ||
                              user.plan === "pro" ||
                              user.plan === "plus"
                                ? user.planType
                                  ? formatPlanType(user.planType)
                                  : "Premium"
                                : "Free"
                            }
                            color={
                              user.plan === "premium" ||
                              user.plan === "pro" ||
                              user.plan === "plus"
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
                              onClick={(e) => {
                                e.preventDefault();
                                const url = `/cms/dashboard/users/${encodeURIComponent(user.userId)}`;
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <Visibility className="w-4 h-4 text-blue-600" />
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
                          <Tooltip title="Revoke all active sessions">
                            <IconButton
                              size="small"
                              onClick={() => handleRevokeSessionsClick(user)}
                              disabled={revoking}
                            >
                              <Logout className="w-4 h-4 text-orange-600" />
                            </IconButton>
                          </Tooltip>
                          {user.subscriptionStatus === "active" &&
                            (user.plan === "premium" ||
                              user.plan === "pro" ||
                              user.plan === "plus" ||
                              user.plan === "enterprise") && (
                              <Tooltip title="Cancel Subscription">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleCancelSubscriptionClick(user)
                                  }
                                  disabled={canceling}
                                >
                                  <Close className="w-4 h-4 text-red-600" />
                                </IconButton>
                              </Tooltip>
                            )}
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row Details */}
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="p-0"
                        sx={{ borderBottom: isExpanded ? 1 : 0 }}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box className="p-4 bg-gray-50">
                            <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Practice Details */}
                              <Paper
                                elevation={0}
                                className="p-4 border border-gray-200"
                                sx={{ borderRadius: 2 }}
                              >
                                <Box className="flex items-center gap-2 mb-3">
                                  <MenuBook className="w-5 h-5 text-blue-600" />
                                  <Typography variant="subtitle2" className="font-semibold">
                                    Practice
                                  </Typography>
                                </Box>
                                <Box className="space-y-2">
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Attempts:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.practiceAttempts.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Completions:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.practiceCompletions.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  {user.practiceAttempts > 0 && (
                                    <Box className="flex justify-between pt-2 border-t">
                                      <Typography variant="body2" className="text-gray-600">
                                        Completion Rate:
                                      </Typography>
                                      <Typography variant="body2" className="font-medium text-blue-600">
                                        {Math.round(
                                          (user.practiceCompletions / user.practiceAttempts) * 100
                                        )}
                                        %
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Paper>

                              {/* Exam Details */}
                              <Paper
                                elevation={0}
                                className="p-4 border border-gray-200"
                                sx={{ borderRadius: 2 }}
                              >
                                <Box className="flex items-center gap-2 mb-3">
                                  <Description className="w-5 h-5 text-purple-600" />
                                  <Typography variant="subtitle2" className="font-semibold">
                                    Exams
                                  </Typography>
                                </Box>
                                <Box className="space-y-2">
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Attempts:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.mockAttempts.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Completions:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.mockCompletions.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  {user.mockAttempts > 0 && (
                                    <Box className="flex justify-between pt-2 border-t">
                                      <Typography variant="body2" className="text-gray-600">
                                        Completion Rate:
                                      </Typography>
                                      <Typography variant="body2" className="font-medium text-purple-600">
                                        {Math.round(
                                          (user.mockCompletions / user.mockAttempts) * 100
                                        )}
                                        %
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Paper>

                              {/* Additional Details */}
                              <Paper
                                elevation={0}
                                className="p-4 border border-gray-200"
                                sx={{ borderRadius: 2 }}
                              >
                                <Box className="flex items-center gap-2 mb-3">
                                  <Insights className="w-5 h-5 text-green-600" />
                                  <Typography variant="subtitle2" className="font-semibold">
                                    Activity Details
                                  </Typography>
                                </Box>
                                <Box className="space-y-2">
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      First Activity:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {formatDate(user.firstActivity)}
                                    </Typography>
                                  </Box>
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Total Activities:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.totalActivities.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Total Tokens:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.totalTokens.toLocaleString()}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Paper>

                              {/* Payment & Risk Details */}
                              <Paper
                                elevation={0}
                                className="p-4 border border-gray-200"
                                sx={{ borderRadius: 2 }}
                              >
                                <Box className="flex items-center gap-2 mb-3">
                                  <Shield className="w-5 h-5 text-orange-600" />
                                  <Typography variant="subtitle2" className="font-semibold">
                                    Payment & Risk
                                  </Typography>
                                </Box>
                                <Box className="space-y-2">
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Payment Events:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.paymentEvents}
                                    </Typography>
                                  </Box>
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Dispute Events:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium text-red-600">
                                      {user.disputeEvents}
                                    </Typography>
                                  </Box>
                                  <Box className="flex justify-between pt-2 border-t">
                                    <Typography variant="body2" className="text-gray-600">
                                      Risk Score:
                                    </Typography>
                                    <Box
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(
                                        user.riskScore
                                      )}`}
                                    >
                                      {getRiskIcon(user.riskScore)}
                                      <span className="ml-1">{user.riskScore}%</span>
                                    </Box>
                                  </Box>
                                </Box>
                              </Paper>

                              {/* Network Details */}
                              <Paper
                                elevation={0}
                                className="p-4 border border-gray-200"
                                sx={{ borderRadius: 2 }}
                              >
                                <Box className="flex items-center gap-2 mb-3">
                                  <Language className="w-5 h-5 text-indigo-600" />
                                  <Typography variant="subtitle2" className="font-semibold">
                                    Network & Devices
                                  </Typography>
                                </Box>
                                <Box className="space-y-2">
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Unique IPs:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.uniqueIpAddresses}
                                    </Typography>
                                  </Box>
                                  <Box className="flex justify-between">
                                    <Typography variant="body2" className="text-gray-600">
                                      Unique Devices:
                                    </Typography>
                                    <Typography variant="body2" className="font-medium">
                                      {user.uniqueUserAgents}
                                    </Typography>
                                  </Box>
                                  {user.ipAddresses && user.ipAddresses.length > 0 && (
                                    <Box className="pt-2 border-t">
                                      <Typography variant="caption" className="text-gray-600 block mb-1">
                                        Recent IPs:
                                      </Typography>
                                      <Typography variant="caption" className="text-gray-500">
                                        {user.ipAddresses.slice(0, 3).join(", ")}
                                        {user.ipAddresses.length > 3 && "..."}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Paper>

                              {/* Subscription Details */}
                              {(user.subscriptionStatus === "active" ||
                                user.subscriptionStatus === "unsubscribed") && (
                                <Paper
                                  elevation={0}
                                  className="p-4 border border-gray-200"
                                  sx={{ borderRadius: 2 }}
                                >
                                  <Box className="flex items-center gap-2 mb-3">
                                    <Schedule className="w-5 h-5 text-teal-600" />
                                    <Typography variant="subtitle2" className="font-semibold">
                                      Subscription
                                    </Typography>
                                  </Box>
                                  <Box className="space-y-2">
                                    <Box className="flex justify-between">
                                      <Typography variant="body2" className="text-gray-600">
                                        Status:
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label={
                                          user.subscriptionStatus === "active"
                                            ? "Active"
                                            : "Unsubscribed"
                                        }
                                        color={
                                          user.subscriptionStatus === "active"
                                            ? "success"
                                            : "default"
                                        }
                                        variant="outlined"
                                      />
                                    </Box>
                                    {user.subscriptionStartDate && (
                                      <Box className="flex justify-between">
                                        <Typography variant="body2" className="text-gray-600">
                                          Start Date:
                                        </Typography>
                                        <Typography variant="body2" className="font-medium">
                                          {formatDate(user.subscriptionStartDate)}
                                        </Typography>
                                      </Box>
                                    )}
                                    {user.subscriptionEndDate && (
                                      <Box className="flex justify-between">
                                        <Typography variant="body2" className="text-gray-600">
                                          End Date:
                                        </Typography>
                                        <Typography variant="body2" className="font-medium">
                                          {formatDate(user.subscriptionEndDate)}
                                        </Typography>
                                      </Box>
                                    )}
                                    {user.subscriptionDurationDays && (
                                      <Box className="flex justify-between pt-2 border-t">
                                        <Typography variant="body2" className="text-gray-600">
                                          Duration:
                                        </Typography>
                                        <Typography variant="body2" className="font-medium">
                                          {user.subscriptionDurationDays} days
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                </Paper>
                              )}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                  );
                  })}
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

      {/* Cancel Subscription Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCancelDialogClose}
        aria-labelledby="cancel-subscription-dialog-title"
        aria-describedby="cancel-subscription-dialog-description"
      >
        <DialogTitle id="cancel-subscription-dialog-title">
          Cancel Subscription
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-subscription-dialog-description">
            Are you sure you want to cancel the subscription for{" "}
            <strong>{selectedUser?.email || selectedUser?.userId}</strong>?
            <br />
            <br />
            This will:
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Immediately cancel the subscription in Stripe</li>
              <li>Update the user's plan to "free" in Clerk</li>
              <li>Update the user's plan in the database</li>
            </ul>
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancelDialogClose}
            disabled={canceling}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCancelSubscriptionConfirm}
            disabled={canceling}
            color="error"
            variant="contained"
          >
            {canceling ? "Canceling..." : "Confirm Cancel"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Sessions Confirmation Dialog */}
      <Dialog
        open={revokeDialogOpen}
        onClose={handleRevokeDialogClose}
        aria-labelledby="revoke-sessions-dialog-title"
        aria-describedby="revoke-sessions-dialog-description"
      >
        <DialogTitle id="revoke-sessions-dialog-title">
          Revoke All Active Sessions
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="revoke-sessions-dialog-description">
            Revoke all active sessions for{" "}
            <strong>{selectedRevokeUser?.email || selectedRevokeUser?.userId}</strong>?
            <br />
            <br />
            This admin action:
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Revokes all active sessions immediately</li>
              <li>Does not apply the 48-hour device restriction</li>
              <li>Clears existing 48-hour device restrictions for this user</li>
            </ul>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleRevokeDialogClose}
            disabled={revoking}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRevokeSessionsConfirm}
            disabled={revoking}
            color="warning"
            variant="contained"
          >
            {revoking ? "Revoking..." : "Confirm Revoke"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync All Users Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => !syncing && setSyncDialogOpen(false)}
        aria-labelledby="sync-users-dialog-title"
        aria-describedby="sync-users-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="sync-users-dialog-title">
          <Box className="flex items-center gap-2">
            <People className="w-5 h-5" />
            Sync All Users from Clerk
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="sync-users-dialog-description">
            {syncStatus && (
              <Box className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Typography variant="body2" className="font-medium mb-2">
                  Current Status:
                </Typography>
                <Box className="space-y-1">
                  <Typography variant="body2">
                    📊 Clerk Users:{" "}
                    <strong>{syncStatus.totalClerkUsers || 0}</strong>
                  </Typography>
                  <Typography variant="body2">
                    💾 MongoDB Users:{" "}
                    <strong>{syncStatus.totalMongoUsers || 0}</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    className={
                      syncStatus.missingUsers && syncStatus.missingUsers > 0
                        ? "text-orange-600 font-medium"
                        : "text-green-600 font-medium"
                    }
                  >
                    {syncStatus.missingUsers && syncStatus.missingUsers > 0
                      ? `⚠️ Missing: ${syncStatus.missingUsers} users`
                      : "✅ All users synced"}
                  </Typography>
                </Box>
              </Box>
            )}
            <Typography variant="body2" className="mb-2">
              This will sync all users from Clerk to MongoDB. This is useful to
              catch up on failed webhooks.
            </Typography>
            <Typography variant="body2" className="mb-2">
              The sync will:
            </Typography>
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Process users in batches of 100</li>
              <li>Only sync users missing from MongoDB</li>
              <li>Preserve existing user data</li>
              <li>Update the users list automatically</li>
            </ul>
            {syncing && (
              <Box className="mt-4 p-3 bg-blue-50 rounded-lg">
                <Typography variant="body2" className="text-blue-700">
                  <CircularProgress size={16} className="mr-2" />
                  Syncing users... This may take a few minutes.
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSyncDialogOpen(false)}
            disabled={syncing}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSyncAllClick}
            disabled={syncing}
            color="primary"
            variant="contained"
            startIcon={syncing ? <CircularProgress size={16} /> : <Refresh />}
          >
            {syncing ? "Syncing..." : "Start Sync"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

