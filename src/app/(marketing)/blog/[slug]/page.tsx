import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box } from "@/components/ui/Box";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getPublishedBlogPostBySlug,
  getRelatedPublishedPosts,
} from "@/lib/blog/public";
import { linkContentServer } from "@/lib/content-linker-server";
import { BlogCtaSection } from "@/components/pages/blog/BlogCtaSection";
import BlogArticleGtm from "@/components/analytics/BlogArticleGtm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

const BLOG_META_DESCRIPTION_OVERRIDES: Record<string, string> = {
  "celpip-writing-task-2-samples-level-9-why-copy-paste-templates-are-failing-in-2026":
    "Explore level 9 CELPIP Writing Task 2 samples and see why copy-paste templates fail in 2026, with practical strategies for natural, high-scoring responses.",
  "the-goldfish-memory-fix-how-to-master-note-taking-for-celpip-listening-parts-4-6":
    "Master note-taking for CELPIP Listening Parts 4 to 6 using a simple memory system, shorthand techniques, and practice drills that boost accuracy under pressure.",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value?: Date | string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString();
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Blog Post Not Found | CELPIP Practice Test",
      description: "The requested blog post could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const baseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";
  const fallbackDescription =
    post.excerpt || stripHtml(post.contentHtml).slice(0, 155) || "CELPIP preparation article.";
  const title = post.seo?.metaTitle || `${post.title} | CELPIP Blog`;
  const description =
    BLOG_META_DESCRIPTION_OVERRIDES[slug] || post.seo?.metaDescription || fallbackDescription;
  const canonicalPath = `/blog/${post.slug}`;
  const path = post.seo?.canonicalUrl?.startsWith("http") ? null : (post.seo?.canonicalUrl || canonicalPath);
  const canonical = path === null ? (post.seo?.canonicalUrl ?? "") : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const ogImage = post.seo?.ogImageUrl || post.featuredImage?.url;
  const ogImageAlt = post.seo?.ogImageAlt || post.featuredImage?.alt || post.title;

  return {
    title,
    description,
    keywords: post.seo?.keywords ?? [],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: ogImageAlt,
            },
          ]
        : undefined,
      authors: [post.authorName],
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      tags: post.tags,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPublishedPosts(post.id, post.categories, post.tags, 3);
  const canonicalUrl = post.seo?.canonicalUrl || `https://celpippracticetest.com/blog/${post.slug}`;
  const ogImage = post.seo?.ogImageUrl || post.featuredImage?.url;
  const ogImageAlt = post.seo?.ogImageAlt || post.featuredImage?.alt || post.title;

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo?.metaDescription || post.excerpt,
    ...(ogImage ? { image: ogImage } : {}),
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "CELPIP Practice Test",
      logo: {
        "@type": "ImageObject",
        url: "https://celpippracticetest.com/logo.png",
      },
    },
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: new Date(post.updatedAt).toISOString(),
    mainEntityOfPage: canonicalUrl,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://celpippracticetest.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://celpippracticetest.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };

  const fullFaq = [
    ...(post.aiSnippet?.question && post.aiSnippet?.answer
      ? [{ question: post.aiSnippet.question, answer: post.aiSnippet.answer }]
      : []),
    ...(post.faq || []),
  ];

  const faqSchema =
    fullFaq.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: fullFaq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
      : null;

  const hasTable = /<table[\s>]/i.test(post.contentHtml ?? "");
  const tableSchema = hasTable
    ? {
      "@context": "https://schema.org",
      "@type": "Table",
      name: post.seo?.metaTitle || `${post.title} – Conversion Chart`,
      about: {
        "@type": "Thing",
        name: "CELPIP score conversion",
        description:
          "CELPIP raw score to level conversion chart for Reading and Listening.",
      },
      mainEntityOfPage: {
        "@id": canonicalUrl,
      },
      isPartOf: {
        "@type": "BlogPosting",
        "@id": canonicalUrl,
        headline: post.title,
      },
    }
    : null;

  const linkedContent = await linkContentServer(post.contentHtml);

  return (
    <Box className="cel-container py-10 md:py-14">
      <BlogArticleGtm
        articleTitle={post.title}
        articleSlug={post.slug}
        categories={post.categories}
      />
      <JsonLd data={blogPostingSchema} />
      <JsonLd data={breadcrumbSchema} />
      {faqSchema ? <JsonLd data={faqSchema} /> : null}
      {tableSchema ? <JsonLd data={tableSchema} /> : null}

      <Box className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 md:p-10">
        <Box className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-slate-900">
            Blog
          </Link>
          <span>/</span>
          <span className="text-slate-700">{post.title}</span>
        </Box>

        <p className="text-sm font-medium uppercase tracking-wide text-blue-600">CELPIP Blog</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
          {post.title}
        </h1>
        <Box className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{formatDate(post.publishedAt)}</span>
          <span>-</span>
          <span>{post.authorName}</span>
          {post.categories.length ? (
            <>
              <span>-</span>
              <span>{post.categories.join(", ")}</span>
            </>
          ) : null}
        </Box>

        <Box className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <Box className="flex min-h-[14rem] w-full flex-col justify-center p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">CELPIP Blog</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900">{post.title}</h2>
          </Box>
        </Box>

        <article
          className="article-content prose prose-blue mt-8 max-w-none overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: linkedContent }}
        />

        {fullFaq.length > 0 ? (
          <Box className="mt-10 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="mt-4 w-full">
              {fullFaq.map((item, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left font-medium text-slate-900">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>
        ) : null}
      </Box>

      <Box className="mx-auto mt-12 max-w-4xl">
        <BlogCtaSection />
      </Box>

      {relatedPosts.length ? (
        <Box className="mx-auto mt-12 flex max-w-4xl flex-col gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Related Articles</h2>
          <Box className="flex flex-col gap-4">
            {relatedPosts.map((related) => (
              <Link key={related.id} href={`/blog/${related.slug}`} className="group block">
                <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                  <Box className="flex flex-col sm:flex-row sm:items-stretch">
                    <Box className="relative w-full shrink-0 overflow-hidden bg-slate-100 sm:h-[180px] sm:w-80 sm:shrink-0 sm:aspect-auto">
                      <Box className="flex h-full w-full flex-col justify-center p-5">
                        <p className="mt-3 line-clamp-2 text-lg font-semibold text-slate-900">{related.title}</p>
                      </Box>
                    </Box>
                    <CardContent className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden p-5 sm:h-[180px]">
                      {related.categories.length > 0 && (
                        <Badge className="mb-2 w-fit bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs">
                          {related.categories[0]}
                        </Badge>
                      )}
                      <p className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {related.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600 leading-relaxed">
                        {related.excerpt || "Read the full article."}
                      </p>
                      <span className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 group-hover:underline">
                        Read article <ChevronRight className="ml-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </CardContent>
                  </Box>
                </Card>
              </Link>
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
