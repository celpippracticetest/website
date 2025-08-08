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

export default async function CMSDashboard() {
  const { data, stats } = await fetchOnboardingData();
  console.log(data, "data");

  const chartData = {
    labels: Object.keys(stats),
    datasets: [
      {
        label: "Number of Selections",
        data: Object.values(stats),
      },
    ],
  };

  return <Dashboard data={data} chartData={chartData} />;
}
