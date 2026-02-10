import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports | CMS Dashboard",
  description:
    "Marketing and analytics reports for the CMS dashboard. View real-time, 24h, 7-day, monthly, and quarterly metrics.",
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
