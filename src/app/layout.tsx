import PremiumPlanDrawer from "./premiumPlanDrawer";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/nextjs";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { LazyIntercom } from "@/components/LazyComponents";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import CriticalCSS from "@/components/CriticalCSS";
import { Metadata } from "next";

const jakarta = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal"],
  preload: true,
  fallback: ["system-ui", "arial"],
});

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
      apple: "/favicon/apple-touch-icon.png",
    },
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";

  return (
    <ClerkProvider>
      <html
        suppressHydrationWarning={true}
        className={`${jakarta.variable}`}
        lang="en"
      >
        <head>
          {/* Critical preloads only */}
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

          {/* Essential DNS prefetch */}
          <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
          <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

          {/* Essential preconnect */}
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

          {/* Font loading - optimized */}
          <link
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap&font-display=swap"
            rel="stylesheet"
          />

          {/* Essential meta tags */}
          <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
          <link
            rel="apple-touch-icon"
            href="/favicon/apple-touch-icon.png"
            sizes="any"
          />
          <link rel="manifest" href="/manifest.json" />

          {/* Service Worker - lazy load */}
          <Script
            id="sw-register"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered: ', registration);
                      })
                      .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                }
              `,
            }}
          />
        </head>
        <body className={`bg-[#F4F7FF]`}>
          {/* Google Tag Manager (noscript) */}
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-M24FJ7JC"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            ></iframe>
          </noscript>

          <NextTopLoader />
          <ReactQueryProvider>{children}</ReactQueryProvider>
          <PremiumPlanDrawer />
          <LazyIntercom />
          <PerformanceMonitor />
          <CriticalCSS />

          {/* Analytics - non-blocking */}
          <Analytics />

          {/* GTM - lazy load */}
          <Script
            id="gtm"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-M24FJ7JC');
              `,
            }}
          />

          {/* Structured Data - lazy load */}
          <Script
            id="structured-data"
            type="application/ld+json"
            strategy="lazyOnload"
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

          {/* Third-party scripts - ultra lazy load */}
          <Script
            id="third-party-loader"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                // Load third-party scripts only when needed
                let thirdPartyLoaded = false;
                
                function loadThirdParty() {
                  if (thirdPartyLoaded) return;
                  thirdPartyLoaded = true;
                  
                  // Load Cello only when needed
                  const sc = document.createElement('script');
                  sc.src = 'https://assets.sandbox.cello.so/app/latest/cello.js';
                  sc.type = 'module';
                  sc.async = true;
                  document.head.appendChild(sc);
                }
                
                // Load on user interaction or after 5 seconds
                ['click', 'scroll', 'mousemove'].forEach(event => {
                  document.addEventListener(event, loadThirdParty, { once: true, passive: true });
                });
                
                setTimeout(loadThirdParty, 5000);
              `,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
