import type { Metadata } from "next";
import HomepageHeroPageClient from "./HomepageHeroPageClient";
import { cmsPageSeo } from "@/lib/seo/cmsPageSeo";

export const metadata: Metadata = cmsPageSeo("/cms/dashboard/homepage-hero");

export default function HomepageHeroPage() {
  return <HomepageHeroPageClient />;
}
