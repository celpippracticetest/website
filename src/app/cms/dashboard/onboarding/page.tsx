import { Metadata } from "next";
import { headers } from "next/headers";
import OnboardingPageClient from "./OnboardingPageClient";

export const metadata: Metadata = {
  title: "Onboarding Data - CMS Dashboard",
};

async function fetchOnboardingNewData(page: number = 1, limit: number = 100) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const baseUrl = host
    ? `${protocol}://${host}`
    : process.env.APP_BASE_URL || "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/onboarding?page=${page}&limit=${limit}&view=new`,
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
  searchParams?: Promise<{ page?: string; limit?: string }>;
}>) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams?.page || "1");
  const limit = parseInt(resolvedSearchParams?.limit || "100");

  let data: any[] = [];
  let statistics: any = {};
  let totalRecords = 0;
  let totalPages = 0;

  try {
    const result = await fetchOnboardingNewData(page, limit);
    totalRecords = result.pagination?.total || 0;
    totalPages = result.pagination?.totalPages || 0;
    statistics = result.statistics || {};

    data = result.data.map((item: any) => {
      const answers = {
        ...(item || {}),
        ...((item && item.answers) || {}),
      };
      return ({
      "User ID": item.userId || "",
      Name: item.name || "",
      "Primary Goal": answers.customPrimaryGoal || answers.primaryGoal || "",
      "Sub Goal": answers.customSubGoal || answers.subGoal || "",
      "Focus Skill": answers.focusSkill || "",
      "Custom Focus Skill": answers.customFocusSkill || "",
      "Target Listening": answers.targetScores?.listening || 0,
      "Target Reading": answers.targetScores?.reading || 0,
      "Target Writing": answers.targetScores?.writing || 0,
      "Target Speaking": answers.targetScores?.speaking || 0,
      "Exam Date": answers.testDate || "",
      "Subscription Duration": item.subscriptionDuration || "—",
      "Answered At": item.answeredAt || "",
      });
    });
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
