import PremiumPlanDrawer from "./premiumPlanDrawer";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import IntercomLoader from "@/components/IntercomLoader";
import { Metadata } from "next";

const jakarta = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal"],
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
  const jsonLdData = {
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
        image: "https://celpippracticetest.com/images/premium_monthly.png",
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
        image: "https://celpippracticetest.com/images/premium_3month.png",
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
  };
  return (
    <ClerkProvider>
      <html
        suppressHydrationWarning={true}
        className={` ${jakarta.variable} `}
        lang="en"
      >
        <head>
          <Analytics />

          {/* Google Tag Manager */}
          <Script
            id="gtm"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','GTM-M24FJ7JC');`,
            }}
          />
          {/* End Google Tag Manager */}

          <Script
            id="cello"
            src="https://assets.sandbox.cello.so/app/latest/cello.js"
            type="module"
            async
            strategy="afterInteractive"
          />
          <Script
            id="json-ld"
            type="application/ld+json"
            strategy="beforeInteractive"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
          />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin={"anonymous"}
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
            rel="stylesheet"
          />
          <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
          <link
            rel="apple-touch-icon"
            href="/favicon/apple-touch-icon.png"
            sizes="any"
          />
          {/* Review Snippet structured data */}
          <Script
            id="review-snippet"
            type="application/ld+json"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: "CELPIP Practice Test Online",
                description:
                  "High-quality online service offering CELPIP mock exams with AI scoring, expert feedback, and realistic test experience.",
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.8",
                  reviewCount: "3132",
                },
              }),
            }}
          />
          {/* End Review Snippet structured data */}
          {/* Organization structured data */}
          <Script
            id="org-schema"
            type="application/ld+json"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "CelpipPracticeTest",
                alternateName:
                  "CELPIP Practice Platform | Mock Exams & Question Bank",
                legalName: "Nextcove Technologies Inc.",
                brand: "CelpipPracticeTest",
                url: baseUrl,
                logo: `${baseUrl}/logo.png`,
                image: `${baseUrl}/logo.png`,
                description:
                  "CelpipPracticeTest.com is the most popular CELPIP preparation platform in Canada and Australia, trusted by over 20,000 test-takers. With 60+ full-length CELPIP mock exams, 3,000+ practice tasks, and instant AI-powered scoring for Speaking & Writing, we provide faster, cheaper, and more accurate preparation to help students reach their target CELPIP score.",
                slogan: "Reach Your CELPIP Score with Mocks & Practice",
                areaServed: "Worldwide",
                foundingDate: "2024",
                foundingLocation: "Canada",
                knowsAbout: [
                  "CELPIP Test Preparation",
                  "English Language Testing",
                  "Canadian Immigration English Requirements",
                  "AI-Powered Language Assessment",
                  "Speaking Skills Assessment",
                  "Writing Skills Assessment",
                  "Listening Skills Assessment",
                  "Reading Skills Assessment",
                  "CELPIP Mock Exams",
                  "CELPIP Practice Questions",
                ],
                keywords:
                  "CELPIP, CELPIP practice test, CELPIP mock exam, CELPIP preparation, English Test, Immigration Canada, Language Assessment, CELPIP practice questions, AI scoring CELPIP",
                paymentAccepted: ["Credit Card", "Stripe"],
                contactPoint: [
                  {
                    "@type": "ContactPoint",
                    contactType: "Customer Service",
                    serviceArea: "Worldwide",
                    email: "support@celpippracticetest.com",
                    availableLanguage: ["en"],
                  },
                ],
                audience: {
                  "@type": "Audience",
                  audienceType:
                    "CELPIP Test Takers, Immigration Candidates, English Language Learners",
                },
                category: "Education Technology",
                termsOfService: `${baseUrl}/terms-of-service`,
                privacyPolicy: `${baseUrl}/privacy-policy`,
                sameAs: ["https://www.facebook.com/celpippracticetest"],
                potentialAction: [
                  {
                    "@type": "SubscribeAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${baseUrl}/profile`,
                    },
                  },
                ],
                mainEntityOfPage: baseUrl,
              }),
            }}
          />
          {/* End Organization structured data */}
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
          {/* End Google Tag Manager (noscript) */}

          <NextTopLoader />
          <ReactQueryProvider>{children}</ReactQueryProvider>
          <PremiumPlanDrawer />
          <IntercomLoader />
        </body>
      </html>
    </ClerkProvider>
  );
}
