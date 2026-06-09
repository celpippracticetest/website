import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: {
    default: "CMS | CELPIP Practice Test",
    template: "%s | CELPIP CMS",
  },
};

export default function CmsRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
