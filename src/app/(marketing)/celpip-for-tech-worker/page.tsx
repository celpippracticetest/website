import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfessionPageTemplate } from "@/components/pages/marketing/ProfessionPageTemplate";
import { getProfessionConfig, getProfessionMetadata } from "@/data/professionPages";

const slug = "celpip-for-tech-worker";

export function generateMetadata(): Metadata {
  const meta = getProfessionMetadata(slug);
  if (!meta) return {};
  return { title: meta.title, description: meta.description, keywords: meta.keywords, openGraph: { title: meta.title, description: meta.description, type: "article" }, alternates: { canonical: meta.canonical } };
}

export default function Page() {
  const config = getProfessionConfig(slug);
  if (!config) notFound();
  return <ProfessionPageTemplate config={config} />;
}
