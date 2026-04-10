import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { getHomepageHeroDisplay } from "@/lib/homepage-hero";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  },
);

function homeCanonicalUrl(): string {
  return (process.env.APP_BASE_URL || "https://celpippracticetest.com").replace(
    /\/?$/,
    ""
  );
}

/** ~55 chars — primary topic first; avoid stuffing (Google ignores meta keywords). */
const HOME_TITLE =
  "CELPIP Practice Test — Reading, Listening & Score Calculator";

/** ~155 chars — one clear value prop; terms appear naturally (SERP snippet length). */
const HOME_DESCRIPTION =
  "Free CELPIP test prep: timed reading and listening practice, instant scored results, an overall score calculator with CLB mapping, plus Writing Task 2 and speaking.";

export async function generateMetadata(): Promise<Metadata> {
  const homepageHero = await getHomepageHeroDisplay();
  const url = homeCanonicalUrl();
  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    alternates: { canonical: url },
    openGraph: {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url,
      siteName: "CELPIP Practice Test",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: homepageHero.imageUrl,
          width: 1200,
          height: 630,
          alt: homepageHero.altText,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [homepageHero.imageUrl],
    },
  };
}

export default async function HomePage() {
  const heroImage = await getHomepageHeroDisplay();
  return (
    <HomePageClient
      heroImage={heroImage}
      participatesInExperiment={false}
      variant="passport"
    />
  );
}
