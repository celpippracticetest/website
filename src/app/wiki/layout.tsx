import { Metadata } from "next";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";
import {
  PUBLIC_PAGE_CACHE_HEADERS,
} from "@/lib/publicPageCache";

/** Keep in sync with `PUBLIC_PAGE_REVALIDATE_SECONDS` in `@/lib/publicPageCache`. */
export const revalidate = 3600;

export async function headers() {
  return PUBLIC_PAGE_CACHE_HEADERS;
}

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  return {
    robots: getIndexingRobotsDirective(appBaseUrl),
  };
}

export default function WikiLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicPageShell footer={<PublicPageFooter />}>{children}</PublicPageShell>
  );
}
