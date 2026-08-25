import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/practice-overview");

export default function PracticeOverviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
