import PromotionManager from "@/components/league/PromotionManager";
import PremiumPlanModal from "@/components/premium-plan/PremiumPlanModal";
import "./globals.css";
import "../../sentry.client.config"; // Initialize Sentry on client
import NextTopLoader from "nextjs-toploader";
import VercelAnalytics from "@/components/analytics/VercelAnalytics";
import { SupabaseAuthHashRecoveryRedirect } from "@/components/auth/SupabaseAuthHashRecoveryRedirect";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { LazyIntercom } from "@/components/LazyComponents";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import CriticalCSS from "@/components/CriticalCSS";
import AuthAnalyticsTracker from "@/components/analytics/AuthAnalyticsTracker";
import MetaPageViewTracker from "@/components/analytics/MetaPageViewTracker";
import ScrollDepthTracker from "@/components/analytics/ScrollDepthTracker";
import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GA4_MEASUREMENT_ID } from "@/lib/ga4-constants";

const jakarta = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal"],
  preload: true,
  fallback: ["system-ui", "arial"],
});

const GTM_ID = "GTM-M24FJ7JC";

export const viewport: Viewport = {
  themeColor: "#3B82F6",
};

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  const metadataBase = new URL(appBaseUrl || "https://celpippracticetest.com");

  return {
    metadataBase,
    title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
    description:
      "Celpip Practice Test platform designed to boost your score with real exam questions, instant results, and expert tips for Listening, Reading, Writing & Speaking.",
    keywords: [
      "CELPIP",
      "CELPIP practice test",
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
        {
          url: "/favicon/android-chrome-192x192.png",
          sizes: "180x180",
          type: "image/png",
        },
        {
          url: "/favicon/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        { url: "/favicon/apple-touch-icon.png" },
        {
          url: "/favicon/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "CELPIP Test",
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
        <link
          rel="manifest"
          href="/manifest.json"
          crossOrigin="use-credentials"
        />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="mask-icon"
          href="/favicon/apple-touch-icon.png"
          color="#3B82F6"
        ></link>

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CELPIP Test" />
        <meta name="theme-color" content="#3B82F6" />

        {/* JSON-LD early is fine */}
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Product",
                  name: "Free Plan",
                  image: "https://celpippracticetest.com/images/free_plan.png",
                  description:
                    "Access limited CELPIP practice with AI feedback for free.",
                  brand: { "@type": "Brand", name: "CELPIPPRACTICETEST.com" },
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "CAD",
                    availability: "https://schema.org/InStock",
                  },
                },
                {
                  "@type": "Product",
                  name: "Premium Monthly",
                  image:
                    "https://celpippracticetest.com/images/premium_monthly.png",
                  description:
                    "Full access to all CELPIP mock exams and AI feedback, billed monthly.",
                  brand: { "@type": "Brand", name: "CELPIPPRACTICETEST.com" },
                  offers: {
                    "@type": "Offer",
                    price: "24.99",
                    priceCurrency: "CAD",
                    availability: "https://schema.org/InStock",
                  },
                },
                {
                  "@type": "Product",
                  name: "Premium 3-Month",
                  image:
                    "https://celpippracticetest.com/images/premium_3month.png",
                  description:
                    "3-month access to full CELPIP preparation tools and mock exams.",
                  brand: { "@type": "Brand", name: "CELPIPPRACTICETEST.com" },
                  offers: {
                    "@type": "Offer",
                    price: "59.99",
                    priceCurrency: "CAD",
                    availability: "https://schema.org/InStock",
                  },
                },
                {
                  "@type": "Organization",
                  name: "Celpip Practice Test",
                  url: baseUrl,
                  logo: `${baseUrl}/logo.png`,
                  description:
                    "CELPIP preparation platform with AI-powered scoring and mock exams.",
                },
              ],
            }),
          }}
        />
      </head>

      <body className="bg-[#F4F7FF]">
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

        <NextTopLoader />
        <ReactQueryProvider>
          <ErrorBoundary>
            <SupabaseAuthHashRecoveryRedirect />
            <Suspense fallback={null}>
              <MetaPageViewTracker />
              <ScrollDepthTracker />
              <AuthAnalyticsTracker />
            </Suspense>
            {children}
          </ErrorBoundary>
        </ReactQueryProvider>
        <PremiumPlanModal />
        <PromotionManager />
        <LazyIntercom />
        <PerformanceMonitor />
        <CriticalCSS />
        <VercelAnalytics />

        {/* Direct GA4 so KPI events reach Analytics even before / without GTM. */}
        <Script
          id="ga4-gtag"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script
          id="ga4-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('consent', 'default', {
                analytics_storage: 'granted',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
              });
              gtag('config', '${GA4_MEASUREMENT_ID}', {
                send_page_view: false
              });
            `,
          }}
        />

        {enableGtm && (
          <Script
            id="gtm-loader"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                  (function(i){
                    if (window.__gtmInjected) return;
                    window.__gtmInjected = false;

                    function injectGTM(){
                      if (window.__gtmInjected) return;
                      window.__gtmInjected = true;

                      window.dataLayer = window.dataLayer || [];
                      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

                      var s = document.createElement('script');
                      s.async = true;
                      s.src = 'https://www.googletagmanager.com/gtm.js?id=' + i;
                      document.head.appendChild(s);
                    }

                    ['click','scroll','mousemove','touchstart','keydown'].forEach(function(evt){
                      window.addEventListener(evt, injectGTM, { once: true, passive: true });
                    });
                  })('${GTM_ID}');
                `,
            }}
          />
        )}

        <Script
          id="third-party-loader"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
                let __thirdPartyLoaded = false;
                function loadThirdParty() {
                  if (__thirdPartyLoaded) return;
                  __thirdPartyLoaded = true;
                  const sc = document.createElement('script');
                  sc.src = 'https://assets.sandbox.cello.so/app/latest/cello.js';
                  sc.type = 'module';
                  sc.async = true;
                  document.head.appendChild(sc);
                }
                ['click','scroll','mousemove','touchstart','keydown'].forEach(e=>{
                  document.addEventListener(e, loadThirdParty, { once: true, passive: true });
                });
              `,
          }}
        />
      </body>
    </html>
  );
}
