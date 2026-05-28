import { Metadata } from "next";
import { AppAuthBridge } from "@/components/app/AppAuthBridge";
import { AppDownloadContent } from "@/components/pages/app/AppDownloadContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { ANDROID_APP_STORE_URL, getIosAppStoreUrl } from "@/lib/mobile/storeUrls";

const DEFAULT_APP_BASE_URL = "https://celpippracticetest.com";

function normalizeAppBaseUrl(raw: string | undefined): string {
  const input = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!input) return DEFAULT_APP_BASE_URL;

  try {
    return new URL(input).toString();
  } catch {
    // continue
  }

  if (/^https?:\/\//i.test(input)) return DEFAULT_APP_BASE_URL;

  const hostPart = input.split("/")[0];
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostPart)) {
    return `http://${input}`;
  }

  return `https://${input}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const url = `${baseUrl}/app`;
  const title = "Download the CELPIP App for iOS & Android | CELPIP Practice Test";
  const description =
    "Download the CELPIP Practice Test app to get on-the-go CELPIP mock practice, instant scoring, and AI-powered feedback for Listening, Reading, Writing, and Speaking.";

  return {
    title,
    description,
    keywords: ["CELPIP app", "CELPIP practice test", "CELPIP mock exam", "AI feedback", "download app"],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      images: [
        {
          url: "/images/hero.png",
          width: 1200,
          height: 630,
          alt: "CELPIP Practice Test app",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/hero.png"],
    },
    robots: { index: true, follow: true },
  };
}

export default function AppDownloadPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const hasCode = "code" in searchParams;
  const hasError = "error" in searchParams;
  if (hasCode || hasError) {
    return <AppAuthBridge />;
  }

  const baseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const pageUrl = `${baseUrl.replace(/\/$/, "")}/app`;
  const webpageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: "Download the CELPIP App for iOS & Android | CELPIP Practice Test",
    description:
      "Download the CELPIP Practice Test app to get on-the-go CELPIP mock practice, instant scoring, and AI-powered feedback for Listening, Reading, Writing, and Speaking.",
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "CELPIP Practice Test",
      url: baseUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <JsonLd data={webpageJsonLd} />
      <AppDownloadContent
        iosAppUrl={getIosAppStoreUrl()}
        androidAppUrl={ANDROID_APP_STORE_URL}
      />
    </>
  );
}
