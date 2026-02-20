import dynamic from "next/dynamic";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | CELPIPPRACTICETEST.com",
  description:
    "The page you requested could not be found on CELPIPPRACTICETEST.com. Return to the homepage or contact support for help.",
  alternates: {
    canonical: "https://celpippracticetest.com/404",
  },
  openGraph: {
    title: "404 - Page Not Found | CELPIPPRACTICETEST.com",
    description:
      "The page you requested could not be found on CELPIPPRACTICETEST.com.",
    url: "https://celpippracticetest.com/404",
    siteName: "CELPIPPRACTICETEST.com",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "404 - Page Not Found | CELPIPPRACTICETEST.com",
    description:
      "The page you requested could not be found on CELPIPPRACTICETEST.com.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

const NotFoundPage = dynamic(() => import("@/components/pages/landing/NotFoundPage"), {
  ssr: true,
});

export default function NotFound() {
  return <NotFoundPage />;
}
