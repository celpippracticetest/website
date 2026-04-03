import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { getHomepageHeroDisplay } from "@/lib/homepage-hero";
import {
  HOME_AB_COOKIE,
  parseHomeAbVariant,
  parseHomeStylePreviewQuery,
} from "@/lib/homeAbTest";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  },
);

type HomePageProps = {
  searchParams: Promise<{ home?: string; s?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { home, s } = await searchParams;
  const cookieStore = await cookies();
  const assigned = parseHomeAbVariant(cookieStore.get(HOME_AB_COOKIE)?.value);
  const preview = parseHomeStylePreviewQuery({ home, s });
  const variant = preview ?? assigned;
  const participatesInExperiment = preview === null;

  const heroImage = await getHomepageHeroDisplay();
  return (
    <HomePageClient
      heroImage={heroImage}
      participatesInExperiment={participatesInExperiment}
      variant={variant}
    />
  );
}
