import { Metadata } from "next";
import Link from "next/link";

import "chart.js/auto";
import * as XLSX from "xlsx";
import type { WorkBook } from "xlsx";
import Dashboard from "@/components/dashboard-app/cms/Dashboard";
import OnboardingNewDashboard from "@/components/dashboard-app/cms/OnboardingNewDashboard";
import mongoClient from "@/lib/mongodb";
import { Box } from "@/components/ui/Box";

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

type PendingRefundRequest = {
  _id: string;
  trackingCode: string;
  fullName: string;
  email: string;
  createdAt: Date | string;
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
    }
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
    }
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
  let pendingRefundRequests: PendingRefundRequest[] = [];

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

  if (tab === "overview") {
    try {
      const pendingFromDefaultDb = await mongoClient
        .db()
        .collection("refundRequests")
        .find({ status: "pending" })
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          _id: 1,
          trackingCode: 1,
          fullName: 1,
          email: 1,
          createdAt: 1,
        })
        .toArray();

      const pendingFromProdDb =
        pendingFromDefaultDb.length > 0
          ? []
          : await mongoClient
              .db("prod")
              .collection("refundRequests")
              .find({ status: "pending" })
              .sort({ createdAt: -1 })
              .limit(10)
              .project({
                _id: 1,
                trackingCode: 1,
                fullName: 1,
                email: 1,
                createdAt: 1,
              })
              .toArray();

      const source = pendingFromDefaultDb.length > 0 ? pendingFromDefaultDb : pendingFromProdDb;
      pendingRefundRequests = source.map((item) => ({
        _id: String(item._id),
        trackingCode: String(item.trackingCode || ""),
        fullName: String(item.fullName || ""),
        email: String(item.email || ""),
        createdAt: item.createdAt || "",
      }));
    } catch (error) {
      console.error("Failed to load pending refund requests for overview:", error);
      pendingRefundRequests = [];
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
        <Box className="flex w-full flex-col gap-[16px]">
          <Box className="rounded-[12px] border border-[#E5E7EB] bg-white p-[16px]">
            <h2 className="text-[20px] font-semibold text-[#111827]">Items That Need Attention</h2>
            <p className="mt-[4px] text-[14px] text-[#6B7280]">
              Pending refund requests that require review.
            </p>

            <Box className="mt-[12px] overflow-hidden rounded-[10px] border border-[#E5E7EB]">
              {pendingRefundRequests.length === 0 ? (
                <Box className="p-[12px] text-[14px] text-[#6B7280]">
                  No pending refund requests.
                </Box>
              ) : (
                <Box className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="border-b bg-[#F9FAFB]">
                      <tr>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Tracking
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Name
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Email
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRefundRequests.map((item) => (
                        <tr key={item._id} className="border-b last:border-b-0">
                          <td className="px-[12px] py-[10px] text-[13px] font-semibold text-[#1F2937]">
                            {item.trackingCode}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.fullName}</td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.email}</td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>

            <Box className="mt-[10px]">
              <Link
                href="/cms/dashboard/refund-requests"
                className="text-[14px] font-medium text-blue-600 hover:text-blue-800"
              >
                Open full refund requests list
              </Link>
            </Box>
          </Box>
        </Box>
      )}

      {tab === "exams" && (
        <div className="text-sm text-gray-700">Exams module goes here.</div>
      )}

      {tab === "users" && (
        <div className="text-sm text-gray-700">Users module goes here.</div>
      )}

      {tab === "reports" && (
        <div className="text-sm text-gray-700">
          <Link
            href="/cms/dashboard/reports"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View marketing and analytics reports
          </Link>
          {" "}(real-time, 24h, 7d, 30d, 90d).
        </div>
      )}

      {tab === "settings" && (
        <div className="text-sm text-gray-700">Settings module goes here.</div>
      )}
    </div>
  );
}
