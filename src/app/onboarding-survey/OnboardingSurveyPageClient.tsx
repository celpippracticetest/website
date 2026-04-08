"use client";

import OnboardingSurvey from "@/components/onboardingSurvey";

export default function OnboardingSurveyPageClient() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7FF]">
      <OnboardingSurvey onComplete={() => {}} />
    </div>
  );
}
