import type { Metadata } from "next";
import SeoResourcePage from "@/components/seo-resource/SeoResourcePage";
import { seoResourcePages } from "@/data/seo-resource-pages";

const page = seoResourcePages["celpip-writing-task-2-samples"];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: `https://celpippracticetest.com/${page.slug}` },
  openGraph: {
    title: page.title,
    description: page.description,
    url: `https://celpippracticetest.com/${page.slug}`,
    type: "article",
  },
  robots: { index: true, follow: true },
};

export default function CelpipWritingTask2SamplesPage() {
  return <SeoResourcePage page={page} />;
}
