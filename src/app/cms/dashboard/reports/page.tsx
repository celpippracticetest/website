"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Box } from "@/components/ui/Box";
import {
  Users,
  UserPlus,
  Activity,
  RefreshCw,
  BarChart3,
  Mic,
  PenTool,
  Headphones,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Target,
  Share2,
  UserCheck,
} from "lucide-react";
import type {
  MetricsResponse,
  SubscriptionMetrics,
  OnboardingMetrics,
  EngagementMetrics,
  ReferralMetrics,
  RetentionMetrics,
} from "@/types/analytics";

type StatsShape = {
  onlineUsers: number;
  recentSignups: number;
  practicingUsers: number;
  recentPractices: number;
  skillBreakdown: {
    Speaking: number;
    Writing: number;
    Listening: number;
    Reading: number;
  };
};

type ReportData = {
  realtime: StatsShape;
  last24h: StatsShape;
  last7d: StatsShape;
  last30d: StatsShape;
  last90d: StatsShape;
};

type RangeType = "realtime" | "last24h" | "last7d" | "last30d" | "last90d";

const RANGE_OPTIONS: { value: RangeType; label: string }[] = [
  { value: "realtime", label: "Realtime" },
  { value: "last24h", label: "Last 24 hours" },
  { value: "last7d", label: "Last 7 days" },
  { value: "last30d", label: "Last month" },
  { value: "last90d", label: "Last 3 months" },
];

function StatCard({
  icon: Icon,
  value,
  label,
  colorClass = "text-gray-700",
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  colorClass?: string;
}) {
  return (
    <Box className="flex flex-col items-center flex-1 min-w-[90px] p-3 rounded-xl bg-gray-50 border border-gray-100">
      <Icon className={`h-5 w-5 ${colorClass}`} />
      <span className="text-lg font-bold text-gray-900 mt-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-gray-500 text-xs text-center">{label}</span>
    </Box>
  );
}

function DurationSelector({
  value,
  onChange,
}: {
  value: RangeType;
  onChange: (value: RangeType) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RangeType)}
      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {RANGE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MarketingCard({
  selectedRange,
  onRangeChange,
  data,
  loading,
}: {
  selectedRange: RangeType;
  onRangeChange: (range: RangeType) => void;
  data: StatsShape | null;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Marketing Activity
            </span>
          </Box>
          <DurationSelector value={selectedRange} onChange={onRangeChange} />
        </Box>
        <Box className="text-sm text-gray-500">Loading...</Box>
      </Box>
    );
  }

  const totalPracticing =
    data.skillBreakdown.Speaking +
    data.skillBreakdown.Writing +
    data.skillBreakdown.Listening +
    data.skillBreakdown.Reading;

  return (
    <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-base text-gray-800">
            Marketing Activity
          </span>
        </Box>
        <DurationSelector value={selectedRange} onChange={onRangeChange} />
      </Box>

      <Box className="flex flex-wrap gap-3">
        <StatCard
          icon={Users}
          value={data.onlineUsers}
          label="Active / Total users"
          colorClass="text-blue-600"
        />
        <StatCard
          icon={UserPlus}
          value={data.recentSignups}
          label="New signups"
          colorClass="text-green-600"
        />
        <StatCard
          icon={Activity}
          value={data.practicingUsers}
          label="Practicing"
          colorClass="text-purple-600"
        />
      </Box>

      <Box className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 text-red-800 text-sm">
          <Mic className="h-3.5 w-3.5" />
          <span>Speaking: {data.skillBreakdown.Speaking.toLocaleString()}</span>
        </Box>
        <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-teal-50 text-teal-800 text-sm">
          <PenTool className="h-3.5 w-3.5" />
          <span>Writing: {data.skillBreakdown.Writing.toLocaleString()}</span>
        </Box>
        <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-800 text-sm">
          <Headphones className="h-3.5 w-3.5" />
          <span>
            Listening: {data.skillBreakdown.Listening.toLocaleString()}
          </span>
        </Box>
        <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 text-purple-800 text-sm">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Reading: {data.skillBreakdown.Reading.toLocaleString()}</span>
        </Box>
      </Box>
      {totalPracticing > 0 && (
        <Box className="text-xs text-gray-500">
          Total practice events: {totalPracticing.toLocaleString()}
        </Box>
      )}
    </Box>
  );
}

function SubscriptionsCard({
  selectedRange,
  onRangeChange,
  data,
  loading,
}: {
  selectedRange: RangeType;
  onRangeChange: (range: RangeType) => void;
  data: SubscriptionMetrics | null;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Users & Subscriptions
            </span>
          </Box>
          <DurationSelector value={selectedRange} onChange={onRangeChange} />
        </Box>
        <Box className="text-sm text-gray-500">Loading...</Box>
      </Box>
    );
  }

  const totalUsers =
    data.byPlan.free + data.byPlan.premium + data.byPlan.pro;

  return (
    <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-base text-gray-800">
            Users & Subscriptions
          </span>
        </Box>
        <DurationSelector value={selectedRange} onChange={onRangeChange} />
      </Box>

      <Box className="flex flex-wrap gap-3">
        <StatCard
          icon={Users}
          value={totalUsers}
          label="Total Users"
          colorClass="text-blue-600"
        />
        <StatCard
          icon={UserPlus}
          value={data.newSubscriptions}
          label="New (period)"
          colorClass="text-green-600"
        />
        <StatCard
          icon={UserCheck}
          value={data.activeSubscriptions}
          label="Premium/Pro"
          colorClass="text-purple-600"
        />
      </Box>

      <Box className="flex flex-col gap-2 pt-2 border-t border-gray-100">
        <Box className="text-xs text-gray-500 font-medium">Current Total by Plan</Box>
        <Box className="flex flex-wrap gap-2">
          <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-gray-800 text-sm">
            <span>Free: {data.byPlan.free.toLocaleString()}</span>
          </Box>
          <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-800 text-sm">
            <span>Premium: {data.byPlan.premium.toLocaleString()}</span>
          </Box>
          <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 text-purple-800 text-sm">
            <span>Pro: {data.byPlan.pro.toLocaleString()}</span>
          </Box>
        </Box>
        
        {(data.newPremiumInPeriod > 0 || data.newProInPeriod > 0) && (
          <Box className="pt-2 border-t border-gray-100">
            <Box className="text-xs text-gray-500 font-medium mb-1.5">New in Period</Box>
            <Box className="flex flex-wrap gap-2">
              {data.newPremiumInPeriod > 0 && (
                <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 text-green-800 text-sm">
                  <span>+{data.newPremiumInPeriod} Premium</span>
                </Box>
              )}
              {data.newProInPeriod > 0 && (
                <Box className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 text-green-800 text-sm">
                  <span>+{data.newProInPeriod} Pro</span>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {data.cancelledSubscriptions > 0 && (
        <Box className="flex flex-wrap gap-3 text-sm text-gray-600 pt-2 border-t border-gray-100">
          <span>Cancelled in period: {data.cancelledSubscriptions}</span>
          {data.churnRate > 0 && <span>Churn rate: {data.churnRate}%</span>}
          {data.conversionRate > 0 && (
            <span>Conversion rate: {data.conversionRate}%</span>
          )}
        </Box>
      )}
    </Box>
  );
}

function OnboardingCard({
  selectedRange,
  onRangeChange,
  data,
  loading,
}: {
  selectedRange: RangeType;
  onRangeChange: (range: RangeType) => void;
  data: OnboardingMetrics | null;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Onboarding
            </span>
          </Box>
          <DurationSelector value={selectedRange} onChange={onRangeChange} />
        </Box>
        <Box className="text-sm text-gray-500">Loading...</Box>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-base text-gray-800">
            Onboarding
          </span>
        </Box>
        <DurationSelector value={selectedRange} onChange={onRangeChange} />
      </Box>

      <Box className="flex flex-wrap gap-3">
        <StatCard
          icon={Target}
          value={`${data.completionRate}%`}
          label="Completion Rate"
          colorClass="text-green-600"
        />
        <StatCard
          icon={Users}
          value={data.totalUsers}
          label="Total Users"
          colorClass="text-blue-600"
        />
        <StatCard
          icon={CheckCircle}
          value={data.completedUsers}
          label="Completed"
          colorClass="text-purple-600"
        />
      </Box>
    </Box>
  );
}

function EngagementCard({
  selectedRange,
  onRangeChange,
  data,
  loading,
}: {
  selectedRange: RangeType;
  onRangeChange: (range: RangeType) => void;
  data: EngagementMetrics | null;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Engagement
            </span>
          </Box>
          <DurationSelector value={selectedRange} onChange={onRangeChange} />
        </Box>
        <Box className="text-sm text-gray-500">Loading...</Box>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-base text-gray-800">
            Engagement
          </span>
        </Box>
        <DurationSelector value={selectedRange} onChange={onRangeChange} />
      </Box>

      <Box className="flex flex-col gap-3">
        <Box>
          <Box className="text-xs text-gray-500 mb-2">Practice</Box>
          <Box className="flex flex-wrap gap-2">
            <StatCard
              icon={Activity}
              value={data.practiceAttempts}
              label="Attempts"
              colorClass="text-blue-600"
            />
            <StatCard
              icon={CheckCircle}
              value={data.practiceCompletions}
              label="Completions"
              colorClass="text-green-600"
            />
            <StatCard
              icon={Target}
              value={`${data.practiceCompletionRate}%`}
              label="Rate"
              colorClass="text-purple-600"
            />
          </Box>
        </Box>

        <Box className="border-t border-gray-100 pt-3">
          <Box className="text-xs text-gray-500 mb-2">Exams / Mocks</Box>
          <Box className="flex flex-wrap gap-2">
            <StatCard
              icon={Activity}
              value={data.examAttempts}
              label="Attempts"
              colorClass="text-blue-600"
            />
            <StatCard
              icon={CheckCircle}
              value={data.examCompletions}
              label="Completions"
              colorClass="text-green-600"
            />
            <StatCard
              icon={Target}
              value={`${data.examCompletionRate}%`}
              label="Rate"
              colorClass="text-purple-600"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ReferralsCard({
  selectedRange,
  onRangeChange,
  data,
  loading,
}: {
  selectedRange: RangeType;
  onRangeChange: (range: RangeType) => void;
  data: ReferralMetrics | null;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Referrals
            </span>
          </Box>
          <DurationSelector value={selectedRange} onChange={onRangeChange} />
        </Box>
        <Box className="text-sm text-gray-500">Loading...</Box>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-base text-gray-800">
            Referrals
          </span>
        </Box>
        <DurationSelector value={selectedRange} onChange={onRangeChange} />
      </Box>

      <Box className="flex flex-wrap gap-3">
        <StatCard
          icon={Share2}
          value={data.totalInvitations}
          label="Total Invites"
          colorClass="text-blue-600"
        />
        <StatCard
          icon={CheckCircle}
          value={data.completedInvitations}
          label="Completed"
          colorClass="text-green-600"
        />
        <StatCard
          icon={Target}
          value={`${data.conversionRate}%`}
          label="Conversion"
          colorClass="text-purple-600"
        />
      </Box>

      <Box className="flex flex-wrap gap-3 text-sm text-gray-600 pt-2 border-t border-gray-100">
        <span>
          Total Revenue: ${data.totalRevenueFromReferrals.toLocaleString()}
        </span>
        <span>
          Avg per Referral: ${data.averageRevenuePerReferral.toLocaleString()}
        </span>
      </Box>
    </Box>
  );
}

function RetentionCard({
  selectedRange,
  onRangeChange,
  data,
  loading,
}: {
  selectedRange: RangeType;
  onRangeChange: (range: RangeType) => void;
  data: RetentionMetrics | null;
  loading: boolean;
}) {
  if (loading || !data) {
    return (
      <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-base text-gray-800">
              Retention
            </span>
          </Box>
          <DurationSelector value={selectedRange} onChange={onRangeChange} />
        </Box>
        <Box className="text-sm text-gray-500">Loading...</Box>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
      <Box className="flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-base text-gray-800">
            Retention
          </span>
        </Box>
        <DurationSelector value={selectedRange} onChange={onRangeChange} />
      </Box>

      <Box className="flex flex-wrap gap-3">
        {data.dau > 0 && (
          <StatCard
            icon={Users}
            value={data.dau}
            label="DAU"
            colorClass="text-blue-600"
          />
        )}
        {data.mau > 0 && (
          <StatCard
            icon={Users}
            value={data.mau}
            label="MAU"
            colorClass="text-blue-600"
          />
        )}
        <StatCard
          icon={Activity}
          value={data.activeUsersCount}
          label="Active Users"
          colorClass="text-green-600"
        />
        <StatCard
          icon={UserPlus}
          value={data.newUsersCount}
          label="New Users"
          colorClass="text-purple-600"
        />
        <StatCard
          icon={UserCheck}
          value={data.returningUsersCount}
          label="Returning"
          colorClass="text-teal-600"
        />
      </Box>

      <Box className="text-sm text-gray-600 pt-2 border-t border-gray-100">
        Retention rate: {data.retentionRate}%
      </Box>
    </Box>
  );
}

export default function ReportsPage() {
  const [selectedRange, setSelectedRange] = useState<RangeType>("last30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketingData, setMarketingData] = useState<ReportData | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsResponse["data"] | null>(
    null
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [marketingRes, metricsRes] = await Promise.all([
        fetch("/api/analytics/reports"),
        fetch(`/api/analytics/metrics?range=${selectedRange}`),
      ]);

      if (!marketingRes.ok || !metricsRes.ok) {
        throw new Error("Failed to fetch reports");
      }

      const marketingJson = await marketingRes.json();
      const metricsJson: MetricsResponse = await metricsRes.json();

      if (marketingJson.success && marketingJson.data) {
        setMarketingData(marketingJson.data);
      }

      if (metricsJson.success && metricsJson.data) {
        setMetricsData(metricsJson.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangeChange = (range: RangeType) => {
    setSelectedRange(range);
  };

  const currentMarketingData =
    marketingData ? marketingData[selectedRange] : null;

  return (
    <Box className="w-full">
      <Box className="flex flex-col gap-6">
        <Box className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Marketing &amp; Analytics Reports
          </h1>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </Box>

        {error && (
          <Box className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-medium text-sm"
            >
              Retry
            </button>
          </Box>
        )}

        <Box className="flex flex-col gap-6">
          <MarketingCard
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            data={currentMarketingData}
            loading={loading}
          />

          <SubscriptionsCard
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            data={metricsData?.subscriptions || null}
            loading={loading}
          />

          <OnboardingCard
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            data={metricsData?.onboarding || null}
            loading={loading}
          />

          <EngagementCard
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            data={metricsData?.engagement || null}
            loading={loading}
          />

          <ReferralsCard
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            data={metricsData?.referrals || null}
            loading={loading}
          />

          <RetentionCard
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            data={metricsData?.retention || null}
            loading={loading}
          />
        </Box>

        {!loading && !error && (
          <Box className="text-sm text-gray-500">
            Data from Google Analytics 4 and MongoDB.
          </Box>
        )}
      </Box>
    </Box>
  );
}
