import type { Metadata } from "next";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export const metadata: Metadata = {
  alternates: {
    canonical: `${BASE_URL}/practice-overview`,
  },
};

export default function PracticeOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
