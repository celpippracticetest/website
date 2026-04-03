import React from "react";
import type { HomeAbVariant } from "@/lib/homeAbTest";
import HeroLegacy from "./HeroLegacy";
import HeroRedesign from "./HeroRedesign";
import HeroModern from "./HeroModern";

type HeroProps = {
  heroImage: {
    imageUrl: string;
    altText: string;
  };
  /**
   * Marketing header offset for style 1 & 2 — tighter hero top padding when
   * {@link ClassicHomeHeader} is visible.
   */
  withFixedHeader?: boolean;
  /**
   * - `classic` — style 1: redesign of legacy ({@link HeroRedesign})
   * - `passport` — style 2: all-new diagnostic + prep grid ({@link HeroModern})
   * - `legacy` — style 3: original hero ({@link HeroLegacy})
   */
  variant?: HomeAbVariant;
};

const Hero = ({
  heroImage,
  withFixedHeader = true,
  variant = "classic",
}: HeroProps) => {
  if (variant === "legacy") {
    return <HeroLegacy heroImage={heroImage} />;
  }
  if (variant === "classic") {
    return (
      <HeroRedesign
        heroImage={heroImage}
        withMarketingHeader={withFixedHeader}
      />
    );
  }
  return (
    <HeroModern heroImage={heroImage} withFixedHeader={withFixedHeader} />
  );
};

export default Hero;
