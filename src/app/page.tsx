import dynamic from "next/dynamic";
import { getHomepageHeroDisplay } from "@/lib/homepage-hero";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  },
);

export default async function HomePage() {
  const heroImage = await getHomepageHeroDisplay();

  return <HomePageClient heroImage={heroImage} />;
}
