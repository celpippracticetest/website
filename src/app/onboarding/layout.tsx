import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata: Metadata = pageSeo("/onboarding");

export default function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
