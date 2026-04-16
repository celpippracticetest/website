import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import AskBeavoModal from "@/components/AskBeavo/AskBeavoModal";
import CrispChat from "@/components/CrispChat";
import CrispUserSync from "@/components/CrispUserSync";
import { LazyLeadCapturePopup, LazyPromotionManager } from "@/components/LazyComponents";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ActiveUsersTracker from "@/components/analytics/ActiveUsersTracker";
import AttributionTracker from "@/components/analytics/AttributionTracker";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import RedditPixelTracker from "@/components/analytics/RedditPixelTracker";
import MarketingFooterSection from "@/components/pages/landing/MarketingFooterSection";
import MuiAppRouterCacheProvider from "@/components/MuiAppRouterCacheProvider";
import { getHomepageHeroDisplay } from "@/lib/homepage-hero";
import type { Metadata, Viewport } from "next";
import { Suspense, type ComponentType } from "react";

const NextTopLoaderComponent =
  NextTopLoader as unknown as ComponentType<Record<string, never>>;

const jakarta = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal"],
  preload: true,
  fallback: ["system-ui", "arial"],
});

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ;
const LEGACY_GTM_ID = process.env.NEXT_PUBLIC_GTM_LEGACY_ID ;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ;
const DEFAULT_APP_BASE_URL = "https://celpippracticetest.com";

function normalizeAppBaseUrl(raw: string | undefined): string {
  const input = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!input) return DEFAULT_APP_BASE_URL;

  // If it's already a valid absolute URL, keep it.
  try {
    return new URL(input).toString();
  } catch {
    // continue
  }

  // If it has an http(s) scheme but is still invalid, fall back.
  if (/^https?:\/\//i.test(input)) return DEFAULT_APP_BASE_URL;

  // If no scheme is provided (e.g. "localhost:3000" or "example.com/path"),
  // infer the scheme and prefix.
  const hostPart = input.split("/")[0];
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostPart)) {
    return `http://${input}`;
  }

  return `https://${input}`;
}

export function generateViewport(): Viewport {
  return {
    themeColor: "#3B82F6",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const isPreview = appBaseUrl.includes("vercel.app");
  const homepageHero = await getHomepageHeroDisplay();

  // `APP_BASE_URL` is environment-driven and can occasionally be malformed.
  // If `new URL(...)` throws, Next will crash during rendering.
  let metadataBaseUrl: URL;
  try {
    metadataBaseUrl = new URL(appBaseUrl);
  } catch {
    metadataBaseUrl = new URL(DEFAULT_APP_BASE_URL);
  }

  return {
    metadataBase: metadataBaseUrl,
    title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
    description:
      "CELPIP practice tests with AI scoring: Listening, Reading, Writing, and Speaking. Timed tasks, instant feedback, and CLB-focused prep for test day.",
    authors: [
      {
        name: "CELPIP Practice Test Team",
        url: "https://celpippracticetest.com",
      },
    ],
    icons: {
      icon: "/favicon/favicon.ico",
      apple: [
        { url: "/favicon/android-chrome-192x192.png" },
        { url: "/favicon/android-chrome-192x192.png", sizes: "180x180", type: "image/png" },
        { url: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
        { url: "/favicon/apple-touch-icon.png" },
        { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
      ],
    },
    manifest: "/manifest.json",
    openGraph: {
      title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
      description: "Celpip Practice Test platform designed to boost your score with real exam questions, instant results, and expert tips for Listening, Reading, Writing & Speaking.",
      url: appBaseUrl,
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
      title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
      description: "Celpip Practice Test platform designed to boost your score with real exam questions, instant results, and expert tips for Listening, Reading, Writing & Speaking.",
      images: [homepageHero.imageUrl],
    },
    alternates: {
      canonical: appBaseUrl,
    },
    robots: { index: !isPreview, follow: !isPreview },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const baseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const enableGtm =
    process.env.NODE_ENV === "production" && !baseUrl.includes("vercel.app");
  const enableLegacyGtm = enableGtm && LEGACY_GTM_ID && LEGACY_GTM_ID !== GTM_ID;
  const homepageHero = await getHomepageHeroDisplay();
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <html suppressHydrationWarning className={jakarta.variable} lang="en">
      <head suppressHydrationWarning>
        {/* Critical preloads */}
        <link
          rel="preload"
          as="image"
          href={homepageHero.imageUrl}
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/images/logo.png"
          type="image/png"
          fetchPriority="high"
        />

        {/* DNS prefetch / preconnect */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Icons & PWA */}
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicon/apple-touch-icon.png" color="#3B82F6"></link>

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CELPIP Test" />
        <meta name="theme-color" content="#3B82F6" />

        {/* Load analytics bootstrapping from static assets to keep SSR HTML leaner. */}
        {enableGtm && (
          <Script
            id="gtm-consent-defaults"
            strategy="beforeInteractive"
            src="/scripts/gtm-consent-defaults.js"
          />
        )}

        {enableGtm && (
          <Script
            id="gtm-head"
            strategy="afterInteractive"
            src="/scripts/gtm-init.js"
            data-gtm-id={GTM_ID}
            data-layer="dataLayer"
          />
        )}
        {enableLegacyGtm && (
          <Script
            id="gtm-head-legacy"
            strategy="afterInteractive"
            src="/scripts/gtm-init.js"
            data-gtm-id={LEGACY_GTM_ID}
            data-layer="dataLayer"
          />
        )}

        {/* JSON-LD — inline in initial HTML for SEO bots, no JS execution needed */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [{
                "@type": "Organization",
                name: "Celpip Practice Test",
                url: baseUrl,
                logo: `${baseUrl}/logo.png`,
                description:
                  "CELPIP preparation platform with AI-powered scoring and mock exams.",
              }],
            }),
          }}
        />
      </head>

      <body className="bg-[#F4F7FF]" suppressHydrationWarning>
        <MuiAppRouterCacheProvider>
          <ClerkProvider>
          <AskBeavoModal />
          <CrispChat />
          <CrispUserSync />
          {enableGtm && (
            <noscript>
              <iframe
                src={`/gtm/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          )}
          {enableLegacyGtm && (
            <noscript>
              <iframe
                src={`/gtm/ns.html?id=${LEGACY_GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          )}

          <NextTopLoaderComponent />
          <ErrorBoundary>
            {children}
            <MarketingFooterSection isSignedIn={isSignedIn} />
          </ErrorBoundary>
          <LazyPromotionManager />
          <PerformanceMonitor />
          <Analytics />
          <ActiveUsersTracker />
          <Suspense fallback={null}>
            <AttributionTracker />
            <PageViewTracker />
            {process.env.NODE_ENV === "production" && <RedditPixelTracker />}
          </Suspense>
          <LazyLeadCapturePopup />

          {process.env.NODE_ENV === "production" && (
            <Script
              id="ms-clarity"
              strategy="afterInteractive"
              src="/scripts/clarity-init.js"
              data-clarity-id={CLARITY_ID}
            />
          )}

          <Script src="/scripts/third-party-loader.js" strategy="lazyOnload" />
          </ClerkProvider>
        </MuiAppRouterCacheProvider>
      </body>
    </html>
  );
}