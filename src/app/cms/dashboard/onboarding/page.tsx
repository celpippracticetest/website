import { Metadata } from "next";
import OnboardingPageClient from "./OnboardingPageClient";

export const metadata: Metadata = {
  title: "Onboarding Data - CMS Dashboard",
};

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

export default async function OnboardingPage({
  searchParams,
}: Readonly<{
  searchParams: { page?: string; limit?: string };
}>) {
  const page = parseInt(searchParams?.page || "1");
  const limit = parseInt(searchParams?.limit || "100");

  let data: any[] = [];
  let statistics: any = {};
  let totalRecords = 0;
  let totalPages = 0;

  try {
    const result = await fetchOnboardingNewData(page, limit);
    totalRecords = result.pagination?.total || 0;
    totalPages = result.pagination?.totalPages || 0;
    statistics = result.statistics || {};

    data = result.data.map((item: any) => ({
      "User ID": item.userId || "",
      Name: item.name || "",
      "Primary Goal": item.answers?.customPrimaryGoal || item.answers?.primaryGoal || "",
      "Sub Goal": item.answers?.customSubGoal || item.answers?.subGoal || "",
      "Focus Skill": item.answers?.focusSkill || "",
      "Custom Focus Skill": item.answers?.customFocusSkill || "",
      "Target Listening": item.answers?.targetScores?.listening || 0,
      "Target Reading": item.answers?.targetScores?.reading || 0,
      "Target Writing": item.answers?.targetScores?.writing || 0,
      "Target Speaking": item.answers?.targetScores?.speaking || 0,
      "Answered At": item.answeredAt || "",
    }));
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    data = [];
    statistics = {};
    totalRecords = 0;
    totalPages = 0;
  }

  return (
    <OnboardingPageClient
      data={data}
      totalRecords={totalRecords}
      totalPages={totalPages}
      currentPage={page}
      statistics={statistics}
    />
  );
}
