import OnboardingSurveyPageClient from "./OnboardingSurveyPageClient";
import { userNeedsOnboardingSurvey } from "@/lib/userNeedsOnboardingSurvey";
import { currentUser } from "@/lib/auth/server-auth";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Welcome — Tell us your goals",
  robots: { index: false, follow: false },
};

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
