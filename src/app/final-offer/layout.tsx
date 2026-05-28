import type { Metadata } from "next";
import type { ReactNode } from "react";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function FinalOfferLayout({ children }: { children: ReactNode }) {
  return (
    <PublicPageShell footer={<PublicPageFooter />}>{children}</PublicPageShell>
  );
}
