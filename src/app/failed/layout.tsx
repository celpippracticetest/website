import { Metadata } from "next";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata: Metadata = pageSeo("/failed");

export default function FailedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicPageShell footer={<PublicPageFooter />}>{children}</PublicPageShell>
  );
}
