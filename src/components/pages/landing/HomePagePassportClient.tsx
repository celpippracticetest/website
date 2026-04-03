"use client";

import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { ErrorBoundary } from "react-error-boundary";
import PassportHeader from "@/components/pages/landing/passport/Header";
import PassportHeroSection from "@/components/pages/landing/passport/HeroSection";
import PassportTrustBar from "@/components/pages/landing/passport/TrustBar";
import PassportFeaturesSection from "@/components/pages/landing/passport/FeaturesSection";
import PassportMockExamPreview from "@/components/pages/landing/passport/MockExamPreview";
import PassportComparisonTable from "@/components/pages/landing/passport/ComparisonTable";
import PassportHowItWorks from "@/components/pages/landing/passport/HowItWorks";
import PassportPricingSection from "@/components/pages/landing/passport/PricingSection";
import PassportTestimonialsSection from "@/components/pages/landing/passport/TestimonialsSection";
import PassportFAQSection from "@/components/pages/landing/passport/FAQSection";
import PassportCTASection from "@/components/pages/landing/passport/CTASection";
import PassportMarketingFooter from "@/components/pages/landing/passport/MarketingFooter";
import PassportMobileStickyBar from "@/components/pages/landing/passport/MobileStickyBar";
import HomeAbExperimentTracker from "@/components/analytics/HomeAbExperimentTracker";
import type { HomeAbVariant } from "@/lib/homeAbTest";
import { useChunkErrorHandler } from "@/hooks/useChunkErrorHandler";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-passport-display",
  weight: ["400", "700"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-passport-body",
  weight: ["400", "600", "700"],
});

function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-parchment text-center px-4">
      <h1 className="text-2xl font-semibold text-red-600 mb-4">Failed to Load Content</h1>
      <p className="mb-4">Something went wrong while loading part of the application.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-maple text-white rounded-lg">
        Retry
      </button>
    </div>
  );
}

type HomePagePassportClientProps = {
  participatesInExperiment: boolean;
  variant: HomeAbVariant;
};

export default function HomePagePassportClient({
  participatesInExperiment,
  variant,
}: HomePagePassportClientProps) {
  const shouldReload = useChunkErrorHandler();
  if (shouldReload) return null;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <HomeAbExperimentTracker
        participatesInExperiment={participatesInExperiment}
        variant={variant}
      />
      <div
        className={`passport-home ${playfair.variable} ${sourceSans.variable} min-h-screen flex flex-col bg-parchment text-foreground`}>
        <PassportHeader />
        <main className="flex-1">
          <PassportHeroSection />
          <PassportTrustBar />
          <PassportFeaturesSection />
          <PassportMockExamPreview />
          <PassportComparisonTable />
          <PassportHowItWorks />
          <PassportPricingSection />
          <PassportTestimonialsSection />
          <PassportFAQSection />
          <PassportCTASection />
        </main>
        <PassportMarketingFooter />
        <PassportMobileStickyBar />
      </div>
    </ErrorBoundary>
  );
}
