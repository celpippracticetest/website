import { Metadata } from "next";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "";
  const isPreview = appBaseUrl.includes("vercel.app");
  return {
    robots: {
      index: !isPreview,
      follow: !isPreview,
    },
  };
}

export default function SuccessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicPageShell footer={<PublicPageFooter />}>{children}</PublicPageShell>
  );
}
