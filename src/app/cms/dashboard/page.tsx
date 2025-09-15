import { Metadata } from "next";

import "chart.js/auto";
import * as XLSX from "xlsx";
import type { WorkBook } from "xlsx";
import Dashboard from "@/components/dashboard-app/cms/Dashboard";

export const metadata: Metadata = {
  title: "CMS Dashboard",
};

type OnboardingRecord = {
  "User ID": string;
  Name: string;
  "Answer Part 1": string;
  "Custom Part 1": string;
  "Answer Part 2": string;
  "Custom Part 2": string;
};

async function fetchOnboardingData(page: number = 1, limit: number = 100) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  // const baseUrl = "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/onboarding?page=${page}&limit=${limit}`, {
    cache: "no-cache",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch data: ${res.status}`);
  }

  const result = await res.json();
  return result;
}

async function fetchOnboardingStats() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  
  const res = await fetch(`${baseUrl}/api/onboarding/export`, {
    cache: "no-cache",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const stats = res.headers.get("x-answer-stats");
  return stats ? JSON.parse(decodeURIComponent(stats)) : {};
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
    try {
      const result = await fetchOnboardingData(1, 100);
      // Serialize data to plain objects
      data = result.data.map((item: any) => ({
        "User ID": item.userId || '',
        Name: item.name || '',
        "Answer Part 1": item.answers?.stepOneReasons?.join(", ") || '',
        "Custom Part 1": item.answers?.customReason || '',
        "Answer Part 2": item.answers?.stepTwoReasons?.join(", ") || '',
        "Custom Part 2": item.answers?.customStepTwoReason || '',
      }));
      
      // Get stats separately
      stats = await fetchOnboardingStats();
      chartData = {
        labels: Object.keys(stats),
        datasets: [
          {
            label: "Number of Selections",
            data: Object.values(stats),
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching onboarding data:", error);
      data = [];
      stats = {};
      chartData = null;
    }
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
