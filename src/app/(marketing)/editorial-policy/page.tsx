import type { Metadata } from "next";
import SeoResourcePage from "@/components/seo-resource/SeoResourcePage";
import { seoResourcePages } from "@/data/seo-resource-pages";

const page = seoResourcePages["editorial-policy"];

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
  twitter: {
    card: "summary_large_image",
    title: page.title,
    description: page.description,
    images: ["/images/hero.png"],
  },
  robots: { index: true, follow: true },
};

export default function EditorialPolicyPage() {
  return <SeoResourcePage page={page} />;
}
