import { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import "chart.js/auto";
import * as XLSX from "xlsx";
import type { WorkBook } from "xlsx";
import Dashboard from "@/components/dashboard-app/cms/Dashboard";

export const metadata: Metadata = {
  title: "CMS Dashboard",
};

type OnboardingRecord = {
  Name: string;
  "Answer Part 1": string;
  "Answer Part 2": string;
};

async function fetchOnboardingData() {
  // const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const baseUrl = "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/onboarding`, {
    cache: "no-cache",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const stats = res.headers.get("x-answer-stats");
  const buffer = await res.arrayBuffer();
  const workbook: WorkBook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
  });
  const data = XLSX.utils.sheet_to_json<OnboardingRecord>(
    workbook.Sheets[workbook.SheetNames[0]]
  );
  return { data, stats: stats ? JSON.parse(decodeURIComponent(stats)) : {} };
}

export default async function CMSDashboard({
  searchParams,
}: Readonly<{ searchParams: { tab?: string } }>) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "onboarding", label: "Onboarding" },
    { key: "exams", label: "Exams" },
    { key: "users", label: "Users" },
    { key: "reports", label: "Reports" },
    { key: "settings", label: "Settings" },
  ] as const;
  const tabParam = (searchParams?.tab || "overview").toLowerCase();
  const tab = tabs.some((t) => t.key === tabParam) ? tabParam : "overview";

  // Only fetch onboarding data when needed
  let data: OnboardingRecord[] = [];
  let stats: Record<string, number> = {};
  let chartData: {
    labels: string[];
    datasets: { label: string; data: number[] }[];
  } | null = null;

  if (tab === "onboarding") {
    const result = await fetchOnboardingData();
    data = result.data;
    stats = result.stats as Record<string, number>;
    chartData = {
      labels: Object.keys(stats),
      datasets: [
        {
          label: "Number of Selections",
          data: Object.values(stats),
        },
      ],
    };
  }

  return (
    <div className="w-full">
      {/* Content area */}
      {tab === "onboarding" && <Dashboard data={data} chartData={chartData!} />}

      {tab === "overview" && (
        <div className="text-sm text-gray-700">Welcome to CMS Overview.</div>
      )}

      {tab === "exams" && (
        <div className="text-sm text-gray-700">Exams module goes here.</div>
      )}

      {tab === "users" && (
        <div className="text-sm text-gray-700">Users module goes here.</div>
      )}

      {tab === "reports" && (
        <div className="text-sm text-gray-700">Reports module goes here.</div>
      )}

      {tab === "settings" && (
        <div className="text-sm text-gray-700">Settings module goes here.</div>
      )}
    </div>
  );
}
