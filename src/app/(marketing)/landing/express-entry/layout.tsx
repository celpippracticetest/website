import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata: Metadata = pageSeo("/landing/express-entry");

export default function ExpressEntryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
