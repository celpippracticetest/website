import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    title: "CELPIP Wiki | Study Guides & Exam Strategies",
    description:
      "Browse CELPIP study guides covering Listening, Reading, Writing, and Speaking with practical tips and scoring strategies.",
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

export default function WikiLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
