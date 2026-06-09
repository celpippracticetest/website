import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata: Metadata = pageSeo("/welcome/set-password");

export default function WelcomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
