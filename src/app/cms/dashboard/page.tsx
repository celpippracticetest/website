import { Metadata } from "next";

import "chart.js/auto";
import * as XLSX from "xlsx";
import type { WorkBook } from "xlsx";
import Dashboard from "@/components/dashboard-app/cms/Dashboard";
import OnboardingNewDashboard from "@/components/dashboard-app/cms/OnboardingNewDashboard";

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

type OnboardingNewRecord = {
  "User ID": string;
  Name: string;
  "Test Date": string;
  "Focus Skill": string;
  "Custom Focus Skill": string;
  "Target Listening": number;
  "Target Reading": number;
  "Target Writing": number;
  "Target Speaking": number;
  "Answered At": string;
};

async function fetchOnboardingData(page: number = 1, limit: number = 100) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  // const baseUrl = "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/onboarding?page=${page}&limit=${limit}`,
    {
      cache: "no-cache",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

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

async function fetchOnboardingNewData(page: number = 1, limit: number = 100) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/onboarding-new?page=${page}&limit=${limit}`,
    {
      cache: "no-cache",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch data: ${res.status}`);
  }

  const result = await res.json();
  return result;
}

async function fetchOnboardingNewStats() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/onboarding-new/export`, {
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
}: Readonly<{
  searchParams: { tab?: string; page?: string; limit?: string };
}>) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "onboarding", label: "Onboarding" },
    { key: "onboarding-new", label: "Onboarding New" },
    { key: "exams", label: "Exams" },
    { key: "users", label: "Users" },
    { key: "reports", label: "Reports" },
    { key: "settings", label: "Settings" },
  ] as const;
  const tabParam = (searchParams?.tab || "overview").toLowerCase();
  const tab = tabs.some((t) => t.key === tabParam) ? tabParam : "overview";

  // Pagination parameters
  const page = parseInt(searchParams?.page || "1");
  const limit = parseInt(searchParams?.limit || "100"); // 100 records per page

  // Only fetch onboarding data when needed
  let data: OnboardingRecord[] = [];
  let stats: Record<string, number> = {};
  let chartData: {
    labels: string[];
    datasets: { label: string; data: number[] }[];
  } | null = null;
  let totalRecords = 0;
  let totalPages = 0;

  // Onboarding new data
  let dataNew: OnboardingNewRecord[] = [];
  let statsNew: Record<string, number> = {};
  let chartDataNew: {
    labels: string[];
    datasets: { label: string; data: number[] }[];
  } | null = null;
  let totalRecordsNew = 0;
  let totalPagesNew = 0;

  if (tab === "onboarding") {
    try {
      // Fetch data with pagination
      const result = await fetchOnboardingData(page, limit);
      console.log("📊 API Response:", JSON.stringify(result, null, 2));

      // Get total records and pages from pagination info
      totalRecords = result.pagination?.total || 0;
      totalPages = result.pagination?.totalPages || 0;

      // Get statistics from API response
      stats = result.statistics || {};

      // Serialize data to plain objects
      data = result.data.map((item: any) => ({
        "User ID": item.userId || "",
        Name: item.name || "",
        "Answer Part 1": Array.isArray(item.answers?.stepOneReasons)
          ? item.answers.stepOneReasons.join(", ")
          : item.answers?.stepOneReasons || "",
        "Custom Part 1": item.answers?.customReason || "",
        "Answer Part 2": Array.isArray(item.answers?.stepTwoReasons)
          ? item.answers.stepTwoReasons.join(", ")
          : item.answers?.stepTwoReasons || "",
        "Custom Part 2": item.answers?.customStepTwoReason || "",
      }));
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
      totalRecords = 0;
    }
  }

  if (tab === "onboarding-new") {
    try {
      // Fetch data with pagination
      const result = await fetchOnboardingNewData(page, limit);
      // Get total records and pages from pagination info
      totalRecordsNew = result.pagination?.total || 0;
      totalPagesNew = result.pagination?.totalPages || 0;

      // Get statistics from API response
      statsNew = result.statistics || {};

      // Serialize data to plain objects
      dataNew = result.data.map((item: any) => ({
        "User ID": item.userId || "",
        Name: item.name || "",
        "Test Date": item.answers?.testDate || "",
        "Focus Skill": item.answers?.focusSkill || "",
        "Custom Focus Skill": item.answers?.customFocusSkill || "",
        "Target Listening": item.answers?.targetScores?.listening || 0,
        "Target Reading": item.answers?.targetScores?.reading || 0,
        "Target Writing": item.answers?.targetScores?.writing || 0,
        "Target Speaking": item.answers?.targetScores?.speaking || 0,
        "Answered At": item.answeredAt || "",
      }));
      chartDataNew = {
        labels: Object.keys(statsNew),
        datasets: [
          {
            label: "Number of Selections",
            data: Object.values(statsNew),
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching onboarding new data:", error);
      dataNew = [];
      statsNew = {};
      chartDataNew = null;
      totalRecordsNew = 0;
    }
  }

  return (
    <div className="w-full">
      {/* Content area */}
      {tab === "onboarding" && (
        <Dashboard
          data={data}
          chartData={chartData!}
          totalRecords={totalRecords}
          totalPages={totalPages}
          currentPage={page}
          statistics={stats as any}
        />
      )}

      {tab === "onboarding-new" && (
        <OnboardingNewDashboard
          data={dataNew}
          chartData={chartDataNew!}
          totalRecords={totalRecordsNew}
          totalPages={totalPagesNew}
          currentPage={page}
          statistics={statsNew as any}
        />
      )}

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
        <div className="text-sm text-gray-700">
          Activity reports moved to{" "}
          <a className="underline" href="/cms/dashboard/reports">
            /cms/dashboard/reports
          </a>
          .
        </div>
      )}

      {tab === "settings" && (
        <div className="text-sm text-gray-700">Settings module goes here.</div>
      )}
    </div>
  );
}
