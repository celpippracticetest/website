import dynamic from "next/dynamic";
import type { Metadata } from "next";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageSeo } from "@/lib/seo/pageSeo";
import { buildHomepageProductJsonLd } from "@/lib/seo/siteSchema";
import { getUiAbVariant } from "@/lib/uiAbTest.server";
import { readUiAbQueryParam } from "@/lib/uiAbTest";

export const metadata: Metadata = pageSeo("/");

const HomePageClient = dynamic(
  () => import("@/components/pages/landing/HomePageClient"),
  { ssr: true },
);

const HomePageClassicClient = dynamic(
  () => import("@/components/ui-variants/classic/landing/HomePageClassicClient"),
  { ssr: true },
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const fromQuery =
    readUiAbQueryParam({
      get: (key) => {
        const value = params[key];
        if (Array.isArray(value)) return value[0] ?? null;
        return value ?? null;
      },
      has: (key) => key in params,
    }) ?? null;
  const variant = fromQuery ?? (await getUiAbVariant());

  const homepageProductSchema = buildHomepageProductJsonLd();

  if (variant === "classic") {
    return (
      <>
        <JsonLd data={homepageProductSchema} />
        <HomePageClassicClient />
      </>
    );
  }

  return (
    <>
      <JsonLd data={homepageProductSchema} />
      <PublicPageShell footer={<PublicPageFooter />}>
        <HomePageClient />
      </PublicPageShell>
    </>
  );
}
