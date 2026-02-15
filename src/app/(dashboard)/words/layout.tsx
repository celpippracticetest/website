import type { Metadata } from "next";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export const metadata: Metadata = {
  alternates: {
    canonical: `${BASE_URL}/words`,
  },
};

export default function WordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
