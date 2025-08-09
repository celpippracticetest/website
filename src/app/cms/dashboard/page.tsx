import { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import "chart.js/auto";
import * as XLSX from "xlsx";
import type { WorkBook } from "xlsx";
import Dashboard from "@/components/dashboard-app/cms/Dashboard";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "CMS Dashboard",
};

type OnboardingRecord = {
  Name: string;
  "Answer Part 1": string;
  "Answer Part 2": string;
};

async function fetchOnboardingData(): Promise<{
  data: OnboardingRecord[];
  stats: Record<string, number>;
  error?: string;
}> {
  const h = headers();
  const hostHeader =
    (await h).get("x-forwarded-host") ??
    (await h).get("host") ??
    "localhost:3000";
  const protoHeader = (await h).get("x-forwarded-proto");
  const protocol =
    protoHeader?.split(",")[0] ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  // Prefer VERCEL_URL if provided (without protocol), then normalize host
  const rawHost = process.env.VERCEL_URL ?? hostHeader;
  let host = rawHost.replace(/\.$/, "");
  if (host.endsWith(".vercel.app") && host.startsWith("www.")) {
    host = host.slice(4);
  }
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/onboarding`, {
    cache: "no-store",
    method: "GET",
  });

  const statsHeader = res.headers.get("x-answer-stats");
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    const errText = await res.text();
    return {
      data: [],
      stats: {},
      error: `Failed to fetch /api/onboarding: ${res.status} ${
        res.statusText
      } — ${errText.slice(0, 300)}`,
    };
  }

  if (contentType.includes("application/json")) {
    const json = await res.json();
    return {
      data: [],
      stats: {},
      error: `Unexpected JSON from /api/onboarding: ${JSON.stringify(
        json
      ).slice(0, 300)}`,
    };
  }

  try {
    const buffer = await res.arrayBuffer();
    const workbook: WorkBook = XLSX.read(new Uint8Array(buffer), {
      type: "array",
    });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json<OnboardingRecord>(sheet);
    const stats = statsHeader
      ? JSON.parse(decodeURIComponent(statsHeader))
      : {};
    return { data, stats };
  } catch (e: any) {
    return {
      data: [],
      stats: {},
      error: `Failed to parse onboarding export: ${e?.message ?? e}`,
    };
  }
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
  let error: string | null = null;

  if (tab === "onboarding") {
    const result = await fetchOnboardingData();
    if (result.error) {
      error = result.error;
    } else {
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
  }

  return (
    <div className="w-full">
      {/* Content area */}
      {tab === "onboarding" &&
        (error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-medium mb-1">
              Could not load onboarding data
            </div>
            <pre className="whitespace-pre-wrap break-words">{error}</pre>
            <div className="mt-2 text-xs text-red-600/80">
              Check the /api/onboarding logs. It must return an XLSX (not JSON).
              Also ensure the host is normalized (no leading www on
              *.vercel.app).
            </div>
          </div>
        ) : (
          <Dashboard data={data} chartData={chartData!} />
        ))}

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
