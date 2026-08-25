import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/words");

export default function WordsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
