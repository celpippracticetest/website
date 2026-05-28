"use client";

import { ErrorBoundary } from "react-error-boundary";
import dynamic from "next/dynamic";
import FAQ from "./FAQ";
import { useChunkErrorHandler } from "@/hooks/useChunkErrorHandler";
import { Button } from "@/components/v2/Button";
import {
  HomeFeaturesSection,
  HomeHowItWorksSection,
  HomeTestimonialsSection,
  HomeCtaBanner,
} from "./home";

const Hero = dynamic(() => import("./Hero"), { ssr: true });
const FloatingChatIcon = dynamic(() => import("../../AskBeavo/FloatingChatIcon"), {
  ssr: false,
});

function ErrorFallback() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-2xl font-semibold text-error1">
        Failed to Load Content
      </h1>
      <p className="mb-4 text-text2">
        Something went wrong while loading part of the application.
      </p>
      <Button variant="primary" size="md" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

export default function HomePageClient() {
  const shouldReload = useChunkErrorHandler();
  if (shouldReload) return null;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="relative -mt-[88px] overflow-hidden pt-[88px] screen744:-mt-[96px] screen744:pt-[96px]">
        <Hero />
        <HomeFeaturesSection />
      </div>
      <HomeHowItWorksSection />
      <HomeTestimonialsSection />
      <FAQ />
      <HomeCtaBanner />
      <FloatingChatIcon autoOpen={false} />
    </ErrorBoundary>
  );
}
