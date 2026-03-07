import type { Metadata } from "next";
import HomepageHeroPageClient from "./HomepageHeroPageClient";

export const metadata: Metadata = {
  title: "Homepage Hero Scheduler - CMS Dashboard",
  description: "Manage scheduled homepage hero images for date-based campaigns.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepageHeroPage() {
  return <HomepageHeroPageClient />;
}
