"use client";

import { FeatureShowcaseCards } from "@/components/pages/landing/FeatureShowcaseCards";

export function HomeFeaturesSection() {
  return (
    <section
      aria-labelledby="features-heading"
      className="relative overflow-hidden py-14 screen744:py-20"
    >
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="mx-auto mb-10 max-w-[700px] text-center screen744:mb-14">
          <span className="mb-3 inline-block rounded-full bg-primary6 px-3 py-1 text-xs font-semibold text-primary1">
            Everything You Need
          </span>
          <h2
            id="features-heading"
            className="text-balance text-3xl font-extrabold text-text1 screen744:text-4xl"
          >
            One Platform. All Four Skills.{" "}
            <span className="text-primary1">Real Results.</span>
          </h2>
        </div>

        <FeatureShowcaseCards />
      </div>
    </section>
  );
}
