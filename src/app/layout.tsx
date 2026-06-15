import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import AskBeavoModal from "@/components/AskBeavo/AskBeavoModal";
import TawkLoader from "@/components/TawkLoader";
import TawkUserSync from "@/components/TawkUserSync";
import SupportFloatButton from "@/components/SupportFloatButton";
import AuthAnalyticsTracker from "@/components/analytics/AuthAnalyticsTracker";
import PricingModelAbAnalyticsTracker from "@/components/analytics/PricingModelAbAnalyticsTracker";
import ConsentManager from "@/components/analytics/ConsentManager";
import { LazyPromotionManager } from "@/components/LazyComponents";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ActiveUsersTracker from "@/components/analytics/ActiveUsersTracker";
import AttributionTracker from "@/components/analytics/AttributionTracker";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import RedditPixelTracker from "@/components/analytics/RedditPixelTracker";
import { SupabaseAuthHashRecoveryRedirect } from "@/components/auth/SupabaseAuthHashRecoveryRedirect";
import { WebAuthProvider } from "@/components/auth/WebAuthProvider";
import { getSupabaseAuthUserFromServerCookies } from "@/lib/supabase/server-app-read-user";
import MuiAppRouterCacheProvider from "@/components/MuiAppRouterCacheProvider";
import AndroidDownloadAppBanner from "@/components/mobile/AndroidDownloadAppBanner";
import { getHomepageHeroDisplay } from "@/lib/homepage-hero";
import { getIndexingRobotsDirective } from "@/lib/searchIndexing";
import { UiVariantProvider } from "@/components/ui-variant/UiVariantProvider";
import { getUiAbVariant } from "@/lib/uiAbTest.server";
import { buildRootLayoutJsonLd } from "@/lib/seo/siteSchema";
import type { Metadata, Viewport } from "next";
import { Suspense, type ComponentType } from "react";

const NextTopLoaderComponent =
  NextTopLoader as unknown as ComponentType<Record<string, never>>;

/** Variable font: one CSS/font request vs many static weights (better LCP/FCP). */
const jakarta = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jakarta",
  adjustFontFallback: true,
  preload: true,
  fallback: ["system-ui", "arial"],
});

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() ?? "";
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
    robots: getIndexingRobotsDirective(appBaseUrl),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const uiVariant = await getUiAbVariant();
  const initialSupabaseUser = await getSupabaseAuthUserFromServerCookies();
  const baseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const isProductionAnalytics =
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview";
  const enableGaTag = isProductionAnalytics && Boolean(GA_MEASUREMENT_ID);
  const enableClarity =
    process.env.NODE_ENV === "production" && Boolean(CLARITY_ID);

  return (
    <html
      suppressHydrationWarning
      className={jakarta.variable}
      lang="en"
      data-ui-variant={uiVariant}
    >
      <head suppressHydrationWarning>
        {/* Logo is above-the-fold on every route; homepage hero preload removed (was
            every page + often unused on mobile where hero art is a smaller layout). */}
        <link
          rel="preload"
          as="image"
          href="/images/logo.png"
          type="image/png"
          fetchPriority="high"
        />

        {/* Icons */}
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />

        {/* Unregister legacy PWA service worker for users who previously installed the app */}
        <Script id="pwa-unregister" strategy="afterInteractive">
          {`
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.getRegistrations().then((regs) => {
                for (const reg of regs) {
                  const scriptUrl =
                    reg.active?.scriptURL ||
                    reg.installing?.scriptURL ||
                    reg.waiting?.scriptURL ||
                    "";
                  if (scriptUrl.endsWith("/sw.js")) {
                    reg.unregister();
                  }
                }
              });
            }
          `}
        </Script>

        {/* Fix Stripe/Payment Attribution: preserve original referrer after payment gateway return */}
        <Script id="stripe-payment-referrer-fix" strategy="beforeInteractive">
          {`
            if (typeof document !== "undefined" && document.referrer && (document.referrer.includes("stripe.com") || document.referrer.includes("paypal.com"))) {
              try {
                var originalReferrer = localStorage.getItem("pending_referrer") || window.location.origin;
                Object.defineProperty(document, "referrer", {
                  get: function () { return originalReferrer; },
                });
              } catch (e) {}
            }
          `}
        </Script>

        {enableGaTag && (
          <>
            <Script
              id="google-tag-js"
              strategy="beforeInteractive"
              src={`/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script id="google-tag-config" strategy="beforeInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("consent","default",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});gtag("js",new Date());gtag("config","${GA_MEASUREMENT_ID}",{send_page_view:false});`}
            </Script>
          </>
        )}

        {/* JSON-LD — inline in initial HTML for SEO bots, no JS execution needed */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildRootLayoutJsonLd(baseUrl)),
          }}
        />
      </head>

      <body className={jakarta.className} suppressHydrationWarning>
        <MuiAppRouterCacheProvider>
          <UiVariantProvider variant={uiVariant}>
          <WebAuthProvider initialUser={initialSupabaseUser}>
          <AskBeavoModal />
          <TawkLoader />
          <TawkUserSync />
          <AuthAnalyticsTracker />
          <PricingModelAbAnalyticsTracker />
          {enableGaTag && <ConsentManager />}

          <NextTopLoaderComponent />
          <AndroidDownloadAppBanner />
          <ErrorBoundary>
            <SupabaseAuthHashRecoveryRedirect />
            {children}
          </ErrorBoundary>
          <LazyPromotionManager />
          <PerformanceMonitor />
          <Analytics />
          <SpeedInsights />
          <ActiveUsersTracker />
          <Suspense fallback={null}>
            <AttributionTracker />
            <PageViewTracker />
            {process.env.NODE_ENV === "production" && <RedditPixelTracker />}
          </Suspense>
          {enableClarity && (
            <Script
              id="ms-clarity"
              strategy="afterInteractive"
              src="/scripts/clarity-init.js"
              data-clarity-id={CLARITY_ID}
            />
          )}

          <Script src="/scripts/third-party-loader.js" strategy="lazyOnload" />
          <SupportFloatButton />
          </WebAuthProvider>
          </UiVariantProvider>
        </MuiAppRouterCacheProvider>
      </body>
    </html>
  );
}