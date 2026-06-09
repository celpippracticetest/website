import OnboardingSurveyPageClient from "./OnboardingSurveyPageClient";
import { userNeedsOnboardingSurvey } from "@/lib/userNeedsOnboardingSurvey";
import { currentUser } from "@/lib/auth/server-auth";
import { pageSeo } from "@/lib/seo/pageSeo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = pageSeo("/onboarding-survey");

function safeInternalNextPath(raw: string | undefined): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function OnboardingSurveyPage({ searchParams }: PageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-up");
  }

  const sp = await searchParams;
  const nextPath = safeInternalNextPath(sp.next);

  if (!userNeedsOnboardingSurvey(user)) {
    redirect(nextPath ?? "/practice-overview");
  }

  return <OnboardingSurveyPageClient />;
}
