import PremiumPlanModal from "@/components/premium-plan/PremiumPlanModal";
import "./globals.css";
import "../../sentry.client.config"; // Initialize Sentry on client
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/nextjs";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { LazyIntercom } from "@/components/LazyComponents";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import CriticalCSS from "@/components/CriticalCSS";
import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  
  return {
    title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
    description:
      "Celpip Practice Test platform designed to boost your score with real exam questions, instant results, and expert tips for Listening, Reading, Writing & Speaking.",
    keywords: [
      "CELPIP",
      "CELPIP practice test",
      "CELPIP mock exam",
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
        { url: "/favicon/apple-touch-icon.png" },
        { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/manifest.json",
    themeColor: "#3B82F6",
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
    <ClerkProvider>
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
          <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials"/>
          
          {/* Apple Touch Icons */}
          <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
          
          {/* iOS PWA Meta Tags */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="CELPIP Test" />
          <meta name="theme-color" content="#3B82F6" />

          {/* iOS Splash Screens */}
          {/* iPhone SE, iPod touch 5th generation and later */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/4__iPhone_SE__iPod_touch_5th_generation_and_later_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" href="/splash/4__iPhone_SE__iPod_touch_5th_generation_and_later_landscape.png" />

          {/* iPhone 8, iPhone 7, iPhone 6s, iPhone 6 */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" href="/splash/iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_landscape.png" />

          {/* iPhone 8 Plus, iPhone 7 Plus, iPhone 6s Plus, iPhone 6 Plus */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_landscape.png" />

          {/* iPhone 11 */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iPhone_11__iPhone_XR_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" href="/splash/iPhone_11__iPhone_XR_landscape.png" />

          {/* iPhone 11 Pro Max, iPhone XS Max */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_11_Pro_Max__iPhone_XS_Max_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_11_Pro_Max__iPhone_XS_Max_landscape.png" />

          {/* iPhone 13 mini, iPhone 12 mini, iPhone 11 Pro, iPhone XS, iPhone X */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_landscape.png" />

          {/* iPhone 14 Plus, iPhone 13 Pro Max, iPhone 12 Pro Max */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_landscape.png" />

          {/* iPhone 16, iPhone 15 Pro, iPhone 15, iPhone 14 Pro */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_landscape.png" />

          {/* iPhone 16 Plus, iPhone 15 Pro Max, iPhone 15 Plus, iPhone 14 Pro Max */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_landscape.png" />

          {/* iPhone 16e, iPhone 14, iPhone 13 Pro, iPhone 13, iPhone 12 Pro, iPhone 12 */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_landscape.png" />

          {/* iPhone 17 Pro, iPhone 17, iPhone 16 Pro */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_17_Pro__iPhone_17__iPhone_16_Pro_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_17_Pro__iPhone_17__iPhone_16_Pro_landscape.png" />

          {/* iPhone 17 Pro Max, iPhone 16 Pro Max */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_17_Pro_Max__iPhone_16_Pro_Max_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_17_Pro_Max__iPhone_16_Pro_Max_landscape.png" />

          {/* iPhone Air */}
          <link rel="apple-touch-startup-image" media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_Air_portrait.png" />
          <link rel="apple-touch-startup-image" media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="/splash/iPhone_Air_landscape.png" />

          {/* JSON-LD */}
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
                    image:
                      "https://celpippracticetest.com/images/free_plan.png",
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
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: "4.8",
                      reviewCount: "3132",
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
              {children}
            </ErrorBoundary>
          </ReactQueryProvider>
          <PremiumPlanModal />
          <LazyIntercom />
          <PerformanceMonitor />
          <CriticalCSS />
          <Analytics />

          {enableGtm && (
            <Script
              id="gtm-consent-defaults"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(w){
                    w.dataLayer = w.dataLayer || [];
                    w.dataLayer.push({
                      event: 'default_consent',
                      analytics_storage: 'denied',
                      ad_storage: 'denied',
                      ad_user_data: 'denied',
                      ad_personalization: 'denied'
                    });
                  })(window);
                `,
              }}
            />
          )}

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
    </ClerkProvider>
  );
}