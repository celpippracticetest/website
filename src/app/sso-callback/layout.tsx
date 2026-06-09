import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata: Metadata = pageSeo("/sso-callback");

export default function SsoCallbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
