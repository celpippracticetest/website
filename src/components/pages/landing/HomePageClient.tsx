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
import { HomeHeroAnimatedBackground } from "./home/HomeHeroAnimatedBackground";

const Hero = dynamic(() => import("./Hero"), { ssr: true });

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
      <div className="relative -mt-[calc(88px+var(--android-download-banner-height,0px))] overflow-hidden pt-[calc(88px+var(--android-download-banner-height,0px))] screen744:-mt-[96px] screen744:pt-[96px] screen1280:rounded-b-[200px]">
        <HomeHeroAnimatedBackground />
        <div className="relative z-[1]">
          <Hero />
          <HomeFeaturesSection />
        </div>
      </div>
      <HomeHowItWorksSection />
      <HomeTestimonialsSection />
      <FAQ />
      <HomeCtaBanner />
    </ErrorBoundary>
  );
}
