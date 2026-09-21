import dynamic from "next/dynamic";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildHomepageItemListJsonLd,
  buildHomepageProductJsonLd,
  buildHomepageWebPageJsonLd,
} from "@/lib/seo/siteSchema";

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  {
    ssr: true,
  },
);

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomepageWebPageJsonLd(process.env.APP_BASE_URL)} />
      <JsonLd data={buildHomepageItemListJsonLd(process.env.APP_BASE_URL)} />
      <JsonLd data={buildHomepageProductJsonLd(process.env.APP_BASE_URL)} />
      <HomePageClient />
    </>
  );
}
