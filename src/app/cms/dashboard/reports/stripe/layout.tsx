import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stripe Reports | CMS Dashboard",
  description: "View financial performance, recent transactions, and subscription metrics.",
};

export default function StripeReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
