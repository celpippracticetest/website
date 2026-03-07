"use client";

import React, { useState, useEffect } from "react";
import { Box } from "@/components/ui/Box";
import {
  Button,
  Chip,
  Divider,
  Paper,
  Popover,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  CreditCard,
  DollarSign,
  Activity,
  Clock,
  LucideIcon,
} from "lucide-react";
import dayjs from "dayjs";
import moment from "moment";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ReportData {
  newUsers: MetricData;
  activeSubscribers: MetricData;
  cancelledSubscribers: MetricData;
  newSubscriptions: MetricData;
  revenue: MetricData;
  googleAdsCost: MetricData;
  customerLifetimeValue: MetricData;
  averageSubscriptionDurationDays: MetricData;
  dailyTrends?: DailyTrendPoint[];
  googleAdsCampaigns?: GoogleAdsCampaign[];
}

interface MetricData {
  current: number;
  previous: number;
  change: number;
}

interface DailyTrendPoint {
  date: string;
  newUsers: number;
  newSubscriptions: number;
  activeSubscribers: number;
  cancelledSubscribers: number;
  revenue: number;
  googleAdsCost: number;
}

interface GoogleAdsCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  channelType: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
}

interface ReportDateRange {
  from: Date | null;
  to: Date | null;
}

type TrendMetricKey =
  | "newUsers"
  | "newSubscriptions"
  | "activeSubscribers"
  | "cancelledSubscribers"
  | "revenue"
  | "googleAdsCost";

const TREND_SERIES_CONFIG: Record<
  TrendMetricKey,
  { label: string; color: string; isCost?: boolean }
> = {
  newUsers: { label: "New Users", color: "#2563eb" },
  newSubscriptions: { label: "New Subscriptions", color: "#7c3aed" },
  activeSubscribers: { label: "Active Subscribers", color: "#0ea5e9" },
  cancelledSubscribers: { label: "Cancelled Subscribers", color: "#ef4444", isCost: true },
  revenue: { label: "Stripe Revenue", color: "#16a34a" },
  googleAdsCost: { label: "Google Ads Cost", color: "#f59e0b", isCost: true },
};

export default function QuickReportPage() {
  const [date, setDate] = useState<ReportDateRange>({
    from: moment().subtract(7, "days").toDate(),
    to: new Date(),
  });
  const [draftDate, setDraftDate] = useState<ReportDateRange>(date);
  const [dateAnchorEl, setDateAnchorEl] = useState<HTMLElement | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!date?.from) return;

    const fromDate = date.from;
    const toDate = date.to || date.from;

    // Set end date to end of day to include all events on that day
    const endDateTime = new Date(toDate);
    endDateTime.setHours(23, 59, 59, 999);

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: fromDate.toISOString(),
        endDate: endDateTime.toISOString(),
      });

      const res = await fetch(`/api/cms/reports/quick?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const formatDateRange = (range: ReportDateRange) => {
    if (!range.from) return "Pick a date range";
    if (!range.to) return moment(range.from).format("MMM DD, YYYY");
    return `${moment(range.from).format("MMM DD, YYYY")} - ${moment(range.to).format("MMM DD, YYYY")}`;
  };

  const getSelectedDaysLabel = (range: ReportDateRange) => {
    if (!range.from || !range.to) return "Select start and end dates";
    const days = moment(range.to).endOf("day").diff(moment(range.from).startOf("day"), "days") + 1;
    return `${days} day${days > 1 ? "s" : ""} selected`;
  };

  const setPresetRange = (days: number) => {
    const to = new Date();
    const from = moment().subtract(days - 1, "days").toDate();
    setDraftDate({ from, to });
  };

  const applyDateRange = () => {
    if (!draftDate.from || !draftDate.to) return;
    setDate(draftDate);
    setDateAnchorEl(null);
  };

  const cancelDateRangeChange = () => {
    setDraftDate(date);
    setDateAnchorEl(null);
  };

  const isDatePickerOpen = Boolean(dateAnchorEl);
  const metricTrendData = React.useMemo(() => {
    const daily = data?.dailyTrends ?? [];
    const selectedTrendMetrics = Object.keys(TREND_SERIES_CONFIG) as TrendMetricKey[];
    if (!daily.length) return null;

    return {
      labels: daily.map((point) => moment(point.date).format("MMM D")),
      datasets: selectedTrendMetrics.map((metricKey) => {
        const config = TREND_SERIES_CONFIG[metricKey];
        return {
          label: config.label,
          data: daily.map((point) => point[metricKey]),
          borderColor: config.color,
          backgroundColor: `${config.color}33`,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2,
        };
      }),
    };
  }, [data?.dailyTrends]);

  const metricTrendOptions = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    }),
    []
  );

  const campaignRows = React.useMemo(
    () => data?.googleAdsCampaigns ?? [],
    [data?.googleAdsCampaigns]
  );

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      <Stack spacing={4}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Quick Report
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Overview of critical metrics and performance.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={(event) => {
                setDateAnchorEl(event.currentTarget);
                setDraftDate({ from: date.from, to: date.to });
              }}
              sx={{
                minWidth: 320,
                justifyContent: "flex-start",
                textTransform: "none",
                borderRadius: 2,
                py: 1,
                px: 1.5,
              }}
              startIcon={<CalendarIcon size={16} />}
            >
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <Typography variant="body2" color="text.primary">
                  {formatDateRange(date)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getSelectedDaysLabel(date)}
                </Typography>
              </Box>
            </Button>

            <Popover
              open={isDatePickerOpen}
              anchorEl={dateAnchorEl}
              onClose={cancelDateRangeChange}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Select report period
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getSelectedDaysLabel(draftDate)}
                  </Typography>
                </Box>
                <Divider />
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      display: "flex",
                      flexDirection: { xs: "row", md: "column" },
                      gap: 1,
                      borderBottom: { xs: "1px solid", md: "none" },
                      borderRight: { xs: "none", md: "1px solid" },
                      borderColor: "divider",
                    }}
                  >
                    {[7, 14, 30, 90].map((days) => (
                      <Button
                        key={days}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "none" }}
                        onClick={() => setPresetRange(days)}
                      >
                        Last {days} days
                      </Button>
                    ))}
                  </Box>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Box sx={{ p: 1.5, minWidth: { xs: 300, md: 420 }, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <DatePicker
                        label="Start date"
                        value={draftDate.from ? dayjs(draftDate.from) : null}
                        maxDate={draftDate.to ? dayjs(draftDate.to) : undefined}
                        onChange={(value) =>
                          setDraftDate((prev) => ({
                            ...prev,
                            from: value ? value.startOf("day").toDate() : null,
                          }))
                        }
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                      />
                      <DatePicker
                        label="End date"
                        value={draftDate.to ? dayjs(draftDate.to) : null}
                        minDate={draftDate.from ? dayjs(draftDate.from) : undefined}
                        onChange={(value) =>
                          setDraftDate((prev) => ({
                            ...prev,
                            to: value ? value.endOf("day").toDate() : null,
                          }))
                        }
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                      />
                    </Box>
                  </LocalizationProvider>
                </Box>
                <Divider />
                <Box sx={{ p: 1.5, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button variant="outlined" onClick={cancelDateRangeChange} sx={{ textTransform: "none" }}>
                    Cancel
                  </Button>
                  <Button onClick={applyDateRange} disabled={!draftDate.from || !draftDate.to} sx={{ textTransform: "none" }}>
                    Apply
                  </Button>
                </Box>
              </Paper>
            </Popover>

            <Button onClick={fetchData} disabled={loading} sx={{ textTransform: "none" }}>
              Refresh
            </Button>
          </Box>
        </Box>

        {loading && !data ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5 }}>
            {[1, 2, 3, 4].map((i) => (
              <Paper
                key={i}
                sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", flex: "1 1 260px" }}
              >
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="text" width="70%" height={44} />
                <Skeleton variant="rounded" width="60%" height={24} />
              </Paper>
            ))}
          </Box>
        ) : data ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5 }}>
            <MetricCard
              title="New Users"
              value={data.newUsers.current}
              previousValue={data.newUsers.previous}
              change={data.newUsers.change}
              icon={Users}
              loading={loading}
            />
            <MetricCard
              title="New Subscriptions (Period)"
              value={data.newSubscriptions.current}
              previousValue={data.newSubscriptions.previous}
              change={data.newSubscriptions.change}
              icon={CreditCard}
              loading={loading}
            />
            <MetricCard
              title="Active Subscribers (Total)"
              value={data.activeSubscribers.current}
              previousValue={data.activeSubscribers.previous}
              change={data.activeSubscribers.change}
              icon={CreditCard}
              loading={loading}
            />
            <MetricCard
              title="Cancelled (Period)"
              value={data.cancelledSubscribers.current}
              previousValue={data.cancelledSubscribers.previous}
              change={data.cancelledSubscribers.change}
              icon={CreditCard}
              isCost
              loading={loading}
            />
            <MetricCard
              title="Stripe Revenue"
              value={data.revenue.current}
              previousValue={data.revenue.previous}
              change={data.revenue.change}
              icon={DollarSign}
              prefix="$"
              loading={loading}
            />
            <MetricCard
              title="Google Ads Cost"
              value={data.googleAdsCost.current}
              previousValue={data.googleAdsCost.previous}
              change={data.googleAdsCost.change}
              icon={Activity}
              prefix="$"
              isCost
              loading={loading}
            />
            <MetricCard
              title="Customer Lifetime Value (Avg)"
              value={data.customerLifetimeValue.current}
              previousValue={data.customerLifetimeValue.previous}
              change={data.customerLifetimeValue.change}
              icon={DollarSign}
              prefix="$"
              loading={loading}
            />
            <MetricCard
              title="Avg Subscription Lifetime"
              value={data.averageSubscriptionDurationDays.current}
              previousValue={data.averageSubscriptionDurationDays.previous}
              change={data.averageSubscriptionDurationDays.change}
              icon={Clock}
              suffix=" days"
              loading={loading}
            />
          </Box>
        ) : null}

        {data && metricTrendData && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5 }}>
              Daily Trend
            </Typography>
            <Box sx={{ height: 360, width: "100%" }}>
              <Line data={metricTrendData} options={metricTrendOptions} />
            </Box>
          </Paper>
        )}

        {data && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "center" },
                gap: 1,
                mb: 2.5,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Google Ads Campaigns
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Campaign-level spend and delivery for the selected period.
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${campaignRows.length} campaign${campaignRows.length === 1 ? "" : "s"}`}
                variant="outlined"
              />
            </Box>

            {campaignRows.length ? (
              <Stack spacing={0.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    pb: 1.25,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1.8 }}>
                    Campaign
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 92, textAlign: "right" }}>
                    Cost
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 80, textAlign: "right" }}>
                    Clicks
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 100, textAlign: "right" }}>
                    Impr.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 84, textAlign: "right" }}>
                    Conv.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 70, textAlign: "right" }}>
                    CTR
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 90, textAlign: "right" }}>
                    Avg CPC
                  </Typography>
                </Box>

                {campaignRows.map((campaign) => (
                  <Box
                    key={campaign.campaignId}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      py: 1.25,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-of-type": {
                        borderBottom: "none",
                      },
                    }}
                  >
                    <Box sx={{ flex: 1.8, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {campaign.campaignName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {campaign.channelType} • {campaign.status} • ID {campaign.campaignId}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ width: 92, textAlign: "right", fontWeight: 600 }}>
                      ${campaign.cost.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ width: 80, textAlign: "right" }}>
                      {campaign.clicks.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ width: 100, textAlign: "right" }}>
                      {campaign.impressions.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ width: 84, textAlign: "right" }}>
                      {campaign.conversions.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ width: 70, textAlign: "right" }}>
                      {campaign.ctr.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2" sx={{ width: 90, textAlign: "right" }}>
                      ${campaign.averageCpc.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No Google Ads campaign data was returned for this period. Check the Ads env vars and account access if you expected data here.
              </Typography>
            )}
          </Paper>
        )}

        {data && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5 }}>
              Period Comparison
            </Typography>
            <Stack spacing={0.5}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pb: 1.25,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Metric
                </Typography>
                <Box sx={{ display: "flex", gap: 6 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 96, textAlign: "right" }}>
                    Current
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 96, textAlign: "right" }}>
                    Previous
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 80, textAlign: "right" }}>
                    Change
                  </Typography>
                </Box>
              </Box>

              <ComparisonRow
                label="New Users"
                current={data.newUsers.current}
                previous={data.newUsers.previous}
                change={data.newUsers.change}
              />
              <ComparisonRow
                label="New Subscriptions"
                current={data.newSubscriptions.current}
                previous={data.newSubscriptions.previous}
                change={data.newSubscriptions.change}
              />
              <ComparisonRow
                label="Active Subscribers (Total)"
                current={data.activeSubscribers.current}
                previous={data.activeSubscribers.previous}
                change={data.activeSubscribers.change}
              />
              <ComparisonRow
                label="Cancelled Subscribers"
                current={data.cancelledSubscribers.current}
                previous={data.cancelledSubscribers.previous}
                change={data.cancelledSubscribers.change}
                inverse
              />
              <ComparisonRow
                label="Revenue"
                current={data.revenue.current}
                previous={data.revenue.previous}
                change={data.revenue.change}
                prefix="$"
              />
              <ComparisonRow
                label="Google Ads Cost"
                current={data.googleAdsCost.current}
                previous={data.googleAdsCost.previous}
                change={data.googleAdsCost.change}
                prefix="$"
                inverse
              />
              <ComparisonRow
                label="Customer Lifetime Value (Avg)"
                current={data.customerLifetimeValue.current}
                previous={data.customerLifetimeValue.previous}
                change={data.customerLifetimeValue.change}
                prefix="$"
              />
              <ComparisonRow
                label="Avg Subscription Lifetime (Days)"
                current={data.averageSubscriptionDurationDays.current}
                previous={data.averageSubscriptionDurationDays.previous}
                change={data.averageSubscriptionDurationDays.change}
                suffix=" days"
              />
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

function MetricCard({
  title,
  value,
  previousValue,
  change,
  icon: Icon,
  prefix = "",
  suffix = "",
  isCost = false,
  loading = false,
}: {
  title: string;
  value: number;
  previousValue: number;
  change: number;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  isCost?: boolean;
  loading?: boolean;
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  // For cost: increase (positive change) is bad (red), decrease is good (green)
  // For revenue/users: increase is good (green), decrease is bad (red)
  
  let color = "success.main";
  let IconComponent = TrendingUp;

  if (isNeutral) {
    color = "text.secondary";
    IconComponent = Minus;
  } else if (isCost) {
    // Cost logic
    if (isPositive) {
      color = "error.main"; // Cost went up -> Bad
      IconComponent = TrendingUp;
    } else {
      color = "success.main"; // Cost went down -> Good
      IconComponent = TrendingDown;
    }
  } else {
    // Standard logic (Revenue, Users)
    if (isPositive) {
      color = "success.main"; // Went up -> Good
      IconComponent = TrendingUp;
    } else {
      color = "error.main"; // Went down -> Bad
      IconComponent = TrendingDown;
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flex: "1 1 280px",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
            {loading ? (
              <Skeleton variant="rounded" width={100} height={36} />
            ) : (
              `${prefix}${value.toLocaleString()}${suffix || ""}`
            )}
          </Typography>
        </Box>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: "grey.100", display: "flex" }}>
          <Icon size={18} />
        </Box>
      </Box>

      {!loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            size="small"
            icon={<IconComponent size={14} />}
            label={`${Math.abs(change)}%`}
            sx={{
              color,
              bgcolor: "transparent",
              border: "1px solid",
              borderColor: "divider",
              "& .MuiChip-icon": { color },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            vs previous period
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
  change,
  prefix = "",
  suffix = "",
  inverse = false,
}: {
  label: string;
  current: number;
  previous: number;
  change: number;
  prefix?: string;
  suffix?: string;
  inverse?: boolean;
}) {
  const isPositive = change > 0;
  const isCost = inverse;
  let color = "success.main";

  if (change === 0) color = "text.secondary";
  else if (isCost) color = isPositive ? "error.main" : "success.main";
  else color = isPositive ? "success.main" : "error.main";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": {
          borderBottom: "none",
        },
      }}
    >
      <Typography variant="body2" color="text.primary" fontWeight={500}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", gap: 6 }}>
        <Typography variant="body2" sx={{ width: 96, textAlign: "right", fontWeight: 600 }}>
          {prefix}
          {current.toLocaleString()}
          {suffix}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ width: 96, textAlign: "right" }}>
          {prefix}
          {previous.toLocaleString()}
          {suffix}
        </Typography>
        <Typography variant="body2" sx={{ width: 80, textAlign: "right", fontWeight: 600, color }}>
          {change > 0 ? "+" : ""}
          {change}%
        </Typography>
      </Box>
    </Box>
  );
}
