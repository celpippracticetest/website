"use client";

import React, { useState } from "react";
import { Box } from "@/components/ui/Box";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Autorenew from "@mui/icons-material/Autorenew";
import AttachMoney from "@mui/icons-material/AttachMoney";
import People from "@mui/icons-material/People";
import Insights from "@mui/icons-material/Insights";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import moment from "moment";
import { Button, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Popover, Paper } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
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

interface StripeKpiData {
  range: { startDate: string; endDate: string };
  revenue: {
    grossCents: number;
    collectedCents: number;
    discountCents: number;
    stripeFeeCents: number;
    netCents: number;
    invoiceCount: number;
  };
  subscribers: {
    currentActive: number;
    startedInPeriod: number;
    canceledInPeriod: number;
    byPlan: Array<{
      interval: string;
      intervalCount: number;
      count: number;
    }>;
  };
  churn: {
    churnedSubscribers: number;
    startingSubscribers: number;
    churnRatePercent: number;
  };
  daily: Array<{
    date: string;
    startedSubscriptions: number;
    canceledSubscriptions: number;
  }>;
  sourceFunnel: Array<{
    source: string;
    newSubscriptions: number;
    canceledSubscriptions: number;
    estimatedRevenueCents: number;
  }>;
}

interface StripeSyncResponse {
  success: boolean;
  mode: "till_now" | "range";
  syncedAt: string;
  subscriptions: number;
  customers: number;
  balanceTransactions: number;
  prices: number;
}


export default function StripeReportPage() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(7, 'days'),
    dayjs(),
  ]);
  const [syncMessage, setSyncMessage] = useState<string>("");

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const startDate = dateRange[0]?.toDate();
  const endDate = dateRange[1]?.toDate();

  const { data, isLoading, error } = useQuery<StripeKpiData>({
    queryKey: ["stripe-reports", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }

      const res = await fetch(`/api/cms/reports/stripe?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch Stripe data");
      }
      const payload = await res.json();
      return payload.data as StripeKpiData;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (mode: "till_now" | "range") => {
      const payload =
        mode === "range"
          ? {
            mode: "range",
            fromDate: startDate?.toISOString(),
            toDate: endDate?.toISOString() || new Date().toISOString(),
          }
          : { mode: "till_now" };

      const response = await fetch("/api/cms/reports/stripe/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync Stripe data");
      }

      return data as StripeSyncResponse;
    },
    onSuccess: (result) => {
      setSyncMessage(
        `Sync completed (${result.mode}). Subs: ${result.subscriptions}, Customers: ${result.customers}, Balance Tx: ${result.balanceTransactions}, Prices: ${result.prices}`
      );
      queryClient.invalidateQueries({ queryKey: ["stripe-reports"] });
    },
    onError: (err) => {
      setSyncMessage(`Sync failed: ${(err as Error).message}`);
    },
  });


  // Format currency
  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount / 100);
  };

  const dailyTrendData = React.useMemo(() => {
    const daily = data?.daily || [];
    return {
      labels: daily.map((item) => moment(item.date).format("MMM D")),
      datasets: [
        {
          label: "Started subscriptions",
          data: daily.map((item) => item.startedSubscriptions),
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 74, 0.2)",
          tension: 0.25,
        },
        {
          label: "Canceled subscriptions",
          data: daily.map((item) => item.canceledSubscriptions),
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.2)",
          tension: 0.25,
        },
      ],
    };
  }, [data?.daily]);

  const dailyTrendOptions = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
        },
        title: {
          display: true,
          text: "Items per day in selected period",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0 as const,
          },
        },
      },
    }),
    []
  );

  const formatSource = (source: string) =>
    source
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  if (isLoading) {
    return (
      <Box className="flex h-96 w-full items-center justify-center">
        <Autorenew className="h-8 w-8 animate-spin text-blue-500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="p-4 text-red-500">
        Error loading reports: {(error as Error).message}
      </Box>
    );
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePresetRange = (days: number) => {
    setDateRange([dayjs().subtract(days, 'days'), dayjs()]);
  };

  const presetRanges = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "This month", getRange: () => [dayjs().startOf('month'), dayjs()] },
    { label: "Last month", getRange: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box className="w-full space-y-6">
        <Box className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Stripe Reports</h1>
          <Box className="flex items-center gap-2">
            <Button
              variant="outlined"
              startIcon={<CalendarIcon className="h-4 w-4" />}
              onClick={handleClick}
              sx={{
                minWidth: 320,
                justifyContent: "flex-start",
                textTransform: "none",
                px: 2,
                py: 1.5,
              }}
            >
              {dateRange[0] && dateRange[1]
                ? `${dateRange[0].format("MMM DD, YYYY")} - ${dateRange[1].format("MMM DD, YYYY")}`
                : "Select date range"}
            </Button>
            <Popover
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              PaperProps={{
                sx: { borderRadius: 2, mt: 1 }
              }}
            >
              <Paper sx={{ p: 3, minWidth: 600 }}>
                <Box className="mb-3">
                  <Typography variant="subtitle2" className="mb-2 text-gray-700 font-semibold">
                    Quick Presets
                  </Typography>
                  <Box className="flex flex-wrap gap-2">
                    {presetRanges.map((preset) => (
                      <Button
                        key={preset.label}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (preset.getRange) {
                            const range = preset.getRange();
                            setDateRange([range[0], range[1]]);
                          } else if (preset.days) {
                            handlePresetRange(preset.days);
                          }
                          // Close the popover after selecting a preset
                          handleClose();
                        }}
                        sx={{ textTransform: "none", fontSize: "0.75rem" }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </Box>
                </Box>
                <Box className="border-t pt-3">
                  <Typography variant="subtitle2" className="mb-2 text-gray-700 font-semibold">
                    Custom Range
                  </Typography>
                  <Box className="flex gap-3">
                    <DatePicker
                      label="Start Date"
                      value={dateRange[0]}
                      onChange={(newValue) => {
                        setDateRange([newValue, dateRange[1]]);
                      }}
                      slotProps={{
                        textField: { 
                          size: "small", 
                          sx: { flex: 1 },
                          variant: "outlined"
                        },
                      }}
                    />
                    <DatePicker
                      label="End Date"
                      value={dateRange[1]}
                      onChange={(newValue) => {
                        setDateRange([dateRange[0], newValue]);
                      }}
                      minDate={dateRange[0] || undefined}
                      slotProps={{
                        textField: { 
                          size: "small", 
                          sx: { flex: 1 },
                          variant: "outlined"
                        },
                      }}
                    />
                  </Box>
                </Box>
                <Box className="flex justify-end gap-2 mt-4 pt-3 border-t">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleClose}
                    sx={{ textTransform: "none" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleClose}
                    disabled={!dateRange[0] || !dateRange[1]}
                    sx={{ textTransform: "none" }}
                  >
                    Apply
                  </Button>
                </Box>
              </Paper>
            </Popover>
          </Box>
        </Box>

      <Box className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Box className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Fetch Stripe data into DB manually from this page.
          </p>
          <Box className="flex flex-wrap items-center gap-2">
            <Button
              variant="outlined"
              onClick={() => syncMutation.mutate("range")}
              disabled={syncMutation.isPending || !startDate || !endDate}
            >
              {syncMutation.isPending ? (
                <Autorenew className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Fetch From / To
            </Button>
            <Button
              variant="contained"
              onClick={() => syncMutation.mutate("till_now")}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Autorenew className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Fetch Till Now
            </Button>
          </Box>
        </Box>
        {syncMessage ? (
          <Box className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
            {syncMessage}
          </Box>
        ) : null}
      </Box>

      {/* Summary Cards */}
      <Box className="flex flex-wrap gap-4">
        <SummaryCard
          title="Net Revenue"
          value={formatCurrency(data?.revenue?.netCents || 0, "CAD")}
          icon={<AttachMoney className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
          subtext="After Stripe fees"
        />
        <SummaryCard
          title="New Subscriptions"
          value={data?.subscribers?.startedInPeriod?.toString() || "0"}
          icon={<People className="h-5 w-5 text-indigo-600" />}
          bgColor="bg-indigo-50"
          subtext="Started in selected range"
        />
        <SummaryCard
          title="Active Subscriptions"
          value={data?.subscribers?.currentActive?.toString() || "0"}
          icon={<People className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
          subtext="Current active"
        />
        <SummaryCard
          title="Churn Rate"
          value={`${data?.churn?.churnRatePercent?.toFixed?.(2) || "0.00"}%`}
          icon={<Insights className="h-5 w-5 text-purple-600" />}
          bgColor="bg-purple-50"
          subtext={`${data?.churn?.churnedSubscribers || 0} cancelled / ${data?.churn?.startingSubscribers || 0} start`}
        />
      </Box>

      <Box className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <Box className="h-80 w-full">
          <Line data={dailyTrendData} options={dailyTrendOptions} />
        </Box>
      </Box>

      <Box className="flex flex-wrap gap-4">
        <Box className="min-w-[280px] flex-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Subscribers by Plan</h2>
          <Box className="mt-4 space-y-2 text-sm text-gray-600">
            {data?.subscribers?.byPlan?.length ? (
              data.subscribers.byPlan.map((plan, index) => (
                <Box
                  key={`${plan.interval}-${plan.intervalCount}-${index}`}
                  className="flex items-center justify-between"
                >
                  <span>
                    {plan.intervalCount > 1
                      ? `${plan.intervalCount} ${plan.interval}`
                      : plan.interval}
                  </span>
                  <span className="font-medium text-gray-900">{plan.count}</span>
                </Box>
              ))
            ) : (
              <p className="text-gray-500">No plan data in selected range.</p>
            )}
            <Box className="flex items-center justify-between border-t pt-2">
              <span>Started in range</span>
              <span className="font-semibold text-gray-900">
                {data?.subscribers?.startedInPeriod || 0}
              </span>
            </Box>
            <Box className="flex items-center justify-between">
              <span>Cancelled in range</span>
              <span className="font-semibold text-gray-900">
                {data?.subscribers?.canceledInPeriod || 0}
              </span>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Revenue Funnel by Source</h2>
        <Box className="mt-4 space-y-2 text-sm text-gray-600">
          <Box className="flex items-center justify-between border-b pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Source</span>
            <span>New Subs</span>
            <span>Cancelled</span>
            <span>Est. Revenue</span>
          </Box>
          {data?.sourceFunnel?.length ? (
            data.sourceFunnel.map((item) => (
              <Box
                key={item.source}
                className="flex items-center justify-between border-b border-gray-100 pb-2"
              >
                <span className="font-medium text-gray-900">{formatSource(item.source)}</span>
                <span>{item.newSubscriptions}</span>
                <span>{item.canceledSubscriptions}</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(item.estimatedRevenueCents, "CAD")}
                </span>
              </Box>
            ))
          ) : (
            <p className="text-gray-500">No source funnel data in selected range.</p>
          )}
        </Box>
      </Box>
      </Box>
    </LocalizationProvider>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  bgColor,
  subtext
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  subtext?: string;
}) {
  return (
    <Box className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <Box className="flex items-center justify-between">
        <Box className={`rounded-lg p-2 ${bgColor}`}>{icon}</Box>
        {/* Optional trend icon or similar could go here */}
      </Box>
      <Box className="mt-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </Box>
    </Box>
  );
}
