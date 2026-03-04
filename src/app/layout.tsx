import PromotionManager from "@/components/league/PromotionManager";
import PremiumPlanModal from "@/components/premium-plan/PremiumPlanModal";
import "./globals.css";
import "../../sentry.client.config"; // Initialize Sentry on client
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { LazyIntercom, LazyLeadCapturePopup } from "@/components/LazyComponents";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import CriticalCSS from "@/components/CriticalCSS";
import type { Metadata, Viewport } from "next";
import { Suspense, type ComponentType } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ActiveUsersTracker from "@/components/analytics/ActiveUsersTracker";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import FooterWrapper from "@/components/pages/landing/FooterWrapper";

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

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-M24FJ7JC";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "vqdy02aq70";

export function generateViewport(): Viewport {
  return {
    themeColor: "#3B82F6",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";
  const isPreview = appBaseUrl.includes("vercel.app");

  return {
    metadataBase: new URL(appBaseUrl),
    title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
    description:
      "Celpip Practice Test platform designed to boost your score with real exam questions, instant results, and expert tips for Listening, Reading, Writing & Speaking. Start your free celpip online practice test platform",
    keywords: [
      "CELPIP",
      "CELPIP practice test",
      "celpip online practice test",
      "CELPIP mock exam",
      "CELPIP mock test",
      "CELPIP general practice test",
      "celpip test",
      "free celpip practice test",
      "celpip online practice test",
      "CELPIP preparation",
      "CELPIP listening",
      "CELPIP reading",
      "CELPIP writing",
      "CELPIP speaking",
      "CELPIP score",
      "CELPIP score chart",
      "CELPIP score calculation",
      "CLB conversion",
      "AI scoring",
      "English test Canada",
    ],
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
          url: "/images/hero.png",
          width: 1200,
          height: 630,
          alt: "CELPIP Practice Test Hero Image",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
      description: "Celpip Practice Test platform designed to boost your score with real exam questions, instant results, and expert tips for Listening, Reading, Writing & Speaking.",
      images: ["/images/hero.png"],
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
  const baseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";
  const enableGtm =
    process.env.NODE_ENV === "production" && !baseUrl.includes("vercel.app");
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    // auth() may run on requests that bypass clerkMiddleware (e.g. static asset misses).
    userId = null;
  }
  const isSignedIn = Boolean(userId);

  return (
    <html suppressHydrationWarning className={jakarta.variable} lang="en">
      <head>
        {/* Critical preloads */}
        <link
          rel="preload"
          as="image"
          href="/images/hero.png"
          type="image/png"
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

        <script src="http://localhost:3001/widget.js" data-business-id="celpippracticetest" data-launcher-label="Chat Support" data-position="right" data-accent-color="#2563eb" async></script>

        {/* JSON-LD early is fine */}
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
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

      <body className="bg-[#F4F7FF]">
        <ClerkProvider>
          {enableGtm && (
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          )}

          <NextTopLoaderComponent />
          <ReactQueryProvider>
            <ErrorBoundary>
              {children}
              <FooterWrapper isSignedIn={isSignedIn} />
            </ErrorBoundary>
          </ReactQueryProvider>
          <PremiumPlanModal />
          <PromotionManager />
          <LazyIntercom />
          <PerformanceMonitor />
          <CriticalCSS />
          <Analytics />
          <ActiveUsersTracker />
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          <LazyLeadCapturePopup />

          {process.env.NODE_ENV === "production" && (
            <Script
              id="ms-clarity"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(c,l,a,r,i,t,y){
                      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                  })(window, document, "clarity", "script", "${CLARITY_ID}");
                `,
              }}
            />
          )}

          {enableGtm && (
            <Script src="/scripts/gtm-consent-defaults.js" strategy="afterInteractive" />
          )}

          {enableGtm && (
            <Script
              src={`/scripts/gtm-loader.js?id=${encodeURIComponent(GTM_ID)}`}
              strategy="afterInteractive"
            />
          )}

          <Script src="/scripts/third-party-loader.js" strategy="lazyOnload" />
        </ClerkProvider>
      </body>
    </html>
  );
}