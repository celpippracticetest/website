"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  Loader2,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";

type Funnel = {
  started: number;
  completed: number;
  completionRate: number;
  distinctUsersStarted: number;
  distinctUsersCompleted: number;
};

type ActivityReport = {
  range: { startDate: string; endDate: string };
  practice: Funnel;
  mock: Funnel;
  perUserAverages: {
    activeUsers: number;
    practicesStartedPerActiveUser: number;
    practicesCompletedPerActiveUser: number;
    mocksStartedPerActiveUser: number;
    mocksCompletedPerActiveUser: number;
    mocksStartedPerMockUser: number;
    mocksCompletedPerMockUser: number;
  };
  bySkill: Array<{
    skill: string;
    practiceStarted: number;
    practiceCompleted: number;
    mockStarted: number;
    mockCompleted: number;
  }>;
  daily: Array<{
    day: string;
    practiceStarted: number;
    practiceCompleted: number;
    mockStarted: number;
    mockCompleted: number;
  }>;
  topUsers: Array<{
    userId: string;
    email: string | null;
    practiceStarted: number;
    practiceCompleted: number;
    mockStarted: number;
    mockCompleted: number;
    totalEvents: number;
  }>;
  answersSupplement: {
    practiceAnswers: number;
    examAnswers: number;
    distinctPracticeUsers: number;
    distinctExamUsers: number;
    note: string;
  };
};

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 30);
  return { start: toInputDate(start), end: toInputDate(end) };
}

function fmt(n: number): string {
  return new Intl.NumberFormat().format(n);
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {subtitle ? (
        <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  const initial = useMemo(() => defaultRange(), []);
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ActivityReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        topLimit: "25",
      });
      const res = await fetch(`/api/admin/reports/activity?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as ActivityReport;
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaily = useMemo(() => {
    if (!report?.daily.length) return 1;
    return Math.max(
      1,
      ...report.daily.map(
        (d) =>
          d.practiceStarted +
          d.practiceCompleted +
          d.mockStarted +
          d.mockCompleted,
      ),
    );
  }, [report]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <BarChart3 className="h-6 w-6" />
            Activity Reports
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Practice and mock starts/completions from{" "}
            <code className="rounded bg-gray-100 px-1">user_activities</code>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-600">
            Start
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600">
            End
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading report…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {report && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Practice started"
              value={fmt(report.practice.started)}
              subtitle={`${fmt(report.practice.distinctUsersStarted)} users`}
            />
            <KpiCard
              title="Practice completed"
              value={fmt(report.practice.completed)}
              subtitle={`${report.practice.completionRate}% completion`}
            />
            <KpiCard
              title="Mock started"
              value={fmt(report.mock.started)}
              subtitle={`${fmt(report.mock.distinctUsersStarted)} users`}
            />
            <KpiCard
              title="Mock completed"
              value={fmt(report.mock.completed)}
              subtitle={`${report.mock.completionRate}% completion`}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Users className="h-4 w-4" />
              Per-user averages
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Active users"
                value={fmt(report.perUserAverages.activeUsers)}
              />
              <KpiCard
                title="Practices / active user"
                value={String(
                  report.perUserAverages.practicesStartedPerActiveUser,
                )}
                subtitle={`${report.perUserAverages.practicesCompletedPerActiveUser} completed`}
              />
              <KpiCard
                title="Mocks / active user"
                value={String(report.perUserAverages.mocksStartedPerActiveUser)}
                subtitle={`${report.perUserAverages.mocksCompletedPerActiveUser} completed`}
              />
              <KpiCard
                title="Mocks / mock user"
                value={String(report.perUserAverages.mocksStartedPerMockUser)}
                subtitle={`${report.perUserAverages.mocksCompletedPerMockUser} completed`}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Target className="h-4 w-4" />
              By skill
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-2">Skill</th>
                    <th className="px-2 py-2">Practice start</th>
                    <th className="px-2 py-2">Practice done</th>
                    <th className="px-2 py-2">Mock start</th>
                    <th className="px-2 py-2">Mock done</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bySkill.map((row) => (
                    <tr key={row.skill} className="border-b border-gray-100">
                      <td className="px-2 py-2 font-medium">{row.skill}</td>
                      <td className="px-2 py-2">{fmt(row.practiceStarted)}</td>
                      <td className="px-2 py-2">
                        {fmt(row.practiceCompleted)}
                      </td>
                      <td className="px-2 py-2">{fmt(row.mockStarted)}</td>
                      <td className="px-2 py-2">{fmt(row.mockCompleted)}</td>
                    </tr>
                  ))}
                  {report.bySkill.length === 0 ? (
                    <tr>
                      <td className="px-2 py-4 text-gray-500" colSpan={5}>
                        No skill events in this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Calendar className="h-4 w-4" />
              Daily trend
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Per day:{" "}
              <span className="font-medium text-gray-700">
                Practice started / completed
              </span>{" "}
              ·{" "}
              <span className="font-medium text-gray-700">
                Mock started / completed
              </span>
              . Bar width is total events that day.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-600">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1">
                <span className="font-semibold text-gray-800">P</span>
                practice start / finish
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1">
                <span className="font-semibold text-gray-800">M</span>
                mock start / finish
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {report.daily.map((d) => {
                const total =
                  d.practiceStarted +
                  d.practiceCompleted +
                  d.mockStarted +
                  d.mockCompleted;
                const width = `${Math.max(2, Math.round((total / maxDaily) * 100))}%`;
                return (
                  <div key={d.day} className="flex items-center gap-3 text-xs">
                    <div className="w-24 shrink-0 text-gray-600">{d.day}</div>
                    <div className="h-3 flex-1 rounded bg-gray-100">
                      <div
                        className="h-3 rounded bg-sky-500/80"
                        style={{ width }}
                        title={`Practice ${fmt(d.practiceStarted)} started / ${fmt(d.practiceCompleted)} completed · Mock ${fmt(d.mockStarted)} started / ${fmt(d.mockCompleted)} completed`}
                      />
                    </div>
                    <div
                      className="w-52 shrink-0 text-right text-gray-600"
                      title={`Practice ${fmt(d.practiceStarted)} started / ${fmt(d.practiceCompleted)} completed · Mock ${fmt(d.mockStarted)} started / ${fmt(d.mockCompleted)} completed`}
                    >
                      <span className="text-gray-800">P</span>{" "}
                      {fmt(d.practiceStarted)}/{fmt(d.practiceCompleted)}
                      <span className="mx-1 text-gray-300">·</span>
                      <span className="text-gray-800">M</span>{" "}
                      {fmt(d.mockStarted)}/{fmt(d.mockCompleted)}
                    </div>
                  </div>
                );
              })}
              {report.daily.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No daily activity in range.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Activity className="h-4 w-4" />
              Top users
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Ranked by <span className="font-medium text-gray-700">Total</span>{" "}
              in the selected date range: sum of practice started, practice
              completed, mock started, and mock completed events. Practice /
              Mock columns show{" "}
              <span className="font-medium text-gray-700">
                started / completed
              </span>
              .
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-2">User</th>
                    <th className="px-2 py-2">
                      Practice
                      <div className="font-normal normal-case text-gray-400">
                        start / done
                      </div>
                    </th>
                    <th className="px-2 py-2">
                      Mock
                      <div className="font-normal normal-case text-gray-400">
                        start / done
                      </div>
                    </th>
                    <th className="px-2 py-2">
                      Total
                      <div className="font-normal normal-case text-gray-400">
                        start + done
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.topUsers.map((u) => (
                    <tr key={u.userId} className="border-b border-gray-100">
                      <td className="px-2 py-2">
                        <div className="font-medium text-gray-900">
                          {u.email || "—"}
                        </div>
                        <div className="text-xs text-gray-500">{u.userId}</div>
                      </td>
                      <td className="px-2 py-2">
                        {fmt(u.practiceStarted)} / {fmt(u.practiceCompleted)}
                      </td>
                      <td className="px-2 py-2">
                        {fmt(u.mockStarted)} / {fmt(u.mockCompleted)}
                      </td>
                      <td className="px-2 py-2 font-medium">
                        {fmt(u.totalEvents)}
                      </td>
                    </tr>
                  ))}
                  {report.topUsers.length === 0 ? (
                    <tr>
                      <td className="px-2 py-4 text-gray-500" colSpan={4}>
                        No users in this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold text-amber-900">
              Answers supplement
            </h2>
            <p className="mt-1 text-xs text-amber-800">
              {report.answersSupplement.note}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Practice answers"
                value={fmt(report.answersSupplement.practiceAnswers)}
                subtitle={`${fmt(report.answersSupplement.distinctPracticeUsers)} users`}
              />
              <KpiCard
                title="Exam answers"
                value={fmt(report.answersSupplement.examAnswers)}
                subtitle={`${fmt(report.answersSupplement.distinctExamUsers)} users`}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
