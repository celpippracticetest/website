"use client";

import { ErrorBoundary } from "react-error-boundary";
import dynamic from "next/dynamic";
import Practice from "./Practice";
import FAQ from "./FAQ";
import Hero from "./Hero";
import { ExamModeFeatureSectionLanding } from "@/components/marketing/ExamModeFeatureSection";
import { useChunkErrorHandler } from "@/hooks/useChunkErrorHandler";
import OnlineUsersCount from "@/components/analytics/OnlineUsersCount";
import HomeAbExperimentTracker from "@/components/analytics/HomeAbExperimentTracker";
import type { HomeAbVariant } from "@/lib/homeAbTest";
import SuccessRoadmap from "./SuccessRoadmap";
import PracticeExamSkillLinks from "./PracticeExamSkillLinks";
import ClassicHomeHeader from "./ClassicHomeHeader";
import { cn } from "@/lib/utils";
const Comments = dynamic(() => import("./Comments"), { ssr: false });
const UserResponseReview = dynamic(() => import("./UserResponseReview"), {
  ssr: false,
});
const FloatingChatIcon = dynamic(
  () => import("../../AskBeavo/FloatingChatIcon"),
  {
    ssr: false,
  },
);

type HomePageClientProps = {
  heroImage: {
    imageUrl: string;
    altText: string;
  };
  participatesInExperiment: boolean;
  variant: HomeAbVariant;
};

function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f7ff] text-center">
      <h1 className="text-2xl font-semibold text-red-600 mb-4">
        Failed to Load Content
      </h1>
      <p className="mb-4">
        Something went wrong while loading part of the application.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 text-white rounded">
        Retry
      </button>
    </div>
  );
}

/**
 * Homepage uses style 2 (`passport`) only. `variant` remains typed for shared Hero plumbing.
 */
export default function HomePageClient({
  heroImage,
  participatesInExperiment,
  variant,
}: HomePageClientProps) {
  const shouldReload = useChunkErrorHandler();
  const showMarketingHeader = variant === "classic" || variant === "passport";
  if (shouldReload) return null;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <HomeAbExperimentTracker
        participatesInExperiment={participatesInExperiment}
        variant={variant}
      />
      {showMarketingHeader ? <ClassicHomeHeader /> : null}
      <div
        className={cn(
          "bg-[#F4F7FF]",
          showMarketingHeader && "pt-16 lg:pt-[4.25rem]",
        )}
      >
        <Hero
          heroImage={heroImage}
          withFixedHeader={showMarketingHeader}
          variant={variant}
        />
        <UserResponseReview />
        <div className="flex flex-col mt-[40px] screen744:!mt-[80px] screen1280:!mt-[104px] max-w-[1440px] mx-auto justify-center w-full">
          <div className="flex justify-center px-[16px]">
            <div className="max-w-[1160px] w-full">
              <OnlineUsersCount variant="marketing" className="w-full" />
            </div>
          </div>
        </div>
        {(variant === "classic" || variant === "passport") && <SuccessRoadmap />}
        <Comments />
        <Practice />
        {(variant === "classic" || variant === "passport") && (
          <PracticeExamSkillLinks />
        )}
        <ExamModeFeatureSectionLanding />
        <FAQ />
        <FloatingChatIcon autoOpen={false} />
      </div>
    </ErrorBoundary>
  );
}
