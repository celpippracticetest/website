import PremiumPlanModalGate from "@/components/premium-plan/PremiumPlanModalGate";
import "./globals.css";
import "../../sentry.client.config"; // Initialize Sentry on client
import NextTopLoader from "nextjs-toploader";
import VercelAnalytics from "@/components/analytics/VercelAnalytics";
import { SupabaseAuthHashRecoveryRedirect } from "@/components/auth/SupabaseAuthHashRecoveryRedirect";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import CriticalCSS from "@/components/CriticalCSS";
import AuthAnalyticsTracker from "@/components/analytics/AuthAnalyticsTracker";
import MetaPageViewTracker from "@/components/analytics/MetaPageViewTracker";
import ScrollDepthTracker from "@/components/analytics/ScrollDepthTracker";
import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GA4_MEASUREMENT_ID } from "@/lib/ga4-constants";
import { buildRootLayoutJsonLd } from "@/lib/seo/siteSchema";

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
        {/* Consent Mode default MUST run before GTM/GA4 read consent. */}
        <Script
          id="google-consent-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                analytics_storage: 'granted',
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
              });
              gtag('consent', 'update', {
                analytics_storage: 'granted',
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
              });
            `,
          }}
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

        <Script
          id="celpip-app-platform"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var ua = navigator.userAgent || '';
                var flag = window.__CELPIP_APP_PLATFORM;
                var platform = 'web';
                if (flag === 'android_app' || flag === 'ios_app') {
                  platform = flag;
                } else if (/CELPIPApp\\/|CelpipAppWebView/i.test(ua)) {
                  var isIos = /iPhone|iPad|iPod|iOS|iPadOS|Macintosh/i.test(ua);
                  platform = isIos ? 'ios_app' : 'android_app';
                }
                window.__CELPIP_APP_PLATFORM = platform;
              })();
            `,
          }}
        />

        {/* JSON-LD: global Organization + WebSite, then product offers */}
        {buildRootLayoutJsonLd(baseUrl).map((schema) => (
          <Script
            key={String(schema["@id"])}
            id={`ld-${String(schema["@type"]).toLowerCase()}`}
            type="application/ld+json"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema),
            }}
          />
        ))}
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
        <PremiumPlanModalGate />
        <PerformanceMonitor />
        <CriticalCSS />
        <VercelAnalytics />

        {/* Queue GA4 config immediately; load gtag.js on first user gesture so it
            stays off the Lighthouse TBT window (lazyOnload still ran during lab load). */}
        <Script
          id="ga4-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              (function () {
                var platform = window.__CELPIP_APP_PLATFORM;
                if (platform !== 'android_app' && platform !== 'ios_app' && platform !== 'web') {
                  platform = 'web';
                }
                gtag('set', { app_platform: platform });
                gtag('set', 'user_properties', {
                  platform: platform,
                  app_platform: platform
                });
              })();
              gtag('config', '${GA4_MEASUREMENT_ID}', {
                send_page_view: false
              });
              (function(id){
                function injectGtagSrc(){
                  if (window.__ga4GtagSrcInjected) return;
                  window.__ga4GtagSrcInjected = true;
                  var s = document.createElement('script');
                  s.async = true;
                  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
                  document.head.appendChild(s);
                }
                ['click','scroll','mousemove','touchstart','keydown'].forEach(function(evt){
                  window.addEventListener(evt, injectGtagSrc, { once: true, passive: true });
                });
              })('${GA4_MEASUREMENT_ID}');
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
