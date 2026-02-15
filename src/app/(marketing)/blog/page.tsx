import type { Metadata } from "next";
import Link from "next/link";
import { Box } from "@/components/ui/Box";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublishedBlogPosts } from "@/lib/blog/public";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, User, ArrowRight, ChevronRight } from "lucide-react";
import { BlogCtaSection } from "@/components/pages/blog/BlogCtaSection";
import BlogListGtm from "@/components/analytics/BlogListGtm";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.APP_BASE_URL || "https://celpippracticetest.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "CELPIP Blog | Tips, Strategies, and Score Guides",
    description:
      "Read CELPIP preparation guides, section strategies, and score improvement tips for Listening, Reading, Writing, and Speaking.",
    keywords: [
      "CELPIP blog",
      "CELPIP tips",
      "CELPIP strategies",
      "CELPIP writing guide",
      "CELPIP speaking guide",
      "CELPIP reading tips",
    ],
    alternates: {
      canonical: `${BASE_URL}/blog`,
    },
    openGraph: {
      title: "CELPIP Blog | Tips, Strategies, and Score Guides",
      description:
        "Expert CELPIP resources covering exam strategy, scoring insights, and practical study plans.",
      type: "website",
      url: `${BASE_URL}/blog`,
      images: [
        {
          url: "/images/hero.png",
          width: 1200,
          height: 630,
          alt: "CELPIP Blog",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "CELPIP Blog | Tips, Strategies, and Score Guides",
      description:
        "Expert CELPIP resources covering exam strategy, scoring insights, and practical study plans.",
      images: ["/images/hero.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

function formatDate(value?: Date | string | null): string {
  if (!value) {
    return "Draft";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Draft";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function estimateReadTime(contentHtml?: string): string {
  if (!contentHtml) return "3 min read";
  const words = contentHtml.replace(/<[^>]*>/g, " ").split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

export default async function BlogListingPage() {
  const { items } = await getPublishedBlogPosts(0, 100);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "CELPIP Blog Articles",
    itemListElement: items.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: post.title,
      url: `https://celpippracticetest.com/blog/${post.slug}`,
    })),
  };

  const featuredPost = items.length > 0 ? items[0] : null;
  const recentPosts = items.length > 1 ? items.slice(1) : [];

  return (
    <Box className="min-h-screen bg-slate-50 pb-20">
      <BlogListGtm />
      <JsonLd data={itemListSchema} />

      {/* Hero Section */}
      <Box className="relative isolate overflow-hidden border-b border-slate-200 bg-white pb-16 pt-24">
        <Box className="pointer-events-none absolute inset-0 -z-10 opacity-30">
          <Box className="absolute -left-10 -top-10 h-96 w-96 rounded-full bg-blue-100 blur-3xl" />
          <Box className="absolute right-0 top-20 h-80 w-80 rounded-full bg-indigo-50 blur-3xl" />
        </Box>
        <Box className="cel-container relative z-10 text-center">
          <Badge className="mb-6 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 text-sm font-medium border-blue-100">
            Exam Preparation Resources
          </Badge>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
            CELPIP <span className="text-blue-600">Blog & Insights</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 md:text-xl leading-relaxed">
            Expert strategies, score improvement guides, and practical tips to help you master the CELPIP exam.
          </p>
        </Box>
      </Box>

      <Box className="cel-container mt-12">
        {items.length === 0 ? (
          <Box className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Box className="mb-4 rounded-full bg-slate-100 p-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </Box>
            <h3 className="text-lg font-semibold text-slate-900">No posts yet</h3>
            <p className="text-slate-500">Check back soon for new articles.</p>
          </Box>
        ) : (
          <Box className="flex flex-col gap-12">
            {/* Featured Post */}
            {featuredPost && (
              <Box>
                <h2 className="mb-6 flex items-center text-2xl font-bold text-slate-900">
                  <span className="mr-2 text-blue-600">★</span> Featured Article
                </h2>
                <Link href={`/blog/${featuredPost.slug}`} className="group block">
                  <Card className="overflow-hidden border-0 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group-hover:border-blue-500/30">
                    <Box className="flex flex-col md:flex-row">
                      {/* Image / Visual Placeholder */}
                      <Box className="relative h-64 w-full md:h-auto md:w-2/5 overflow-hidden">
                        {featuredPost.featuredImage?.url ? (
                          <img
                            src={featuredPost.featuredImage.url}
                            alt={featuredPost.featuredImage.alt || featuredPost.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <Box className="h-full w-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-6xl font-bold text-white opacity-20">CELPIP</span>
                          </Box>
                        )}
                        <Box className="absolute top-4 left-4 flex flex-wrap gap-2">
                          {featuredPost.categories.slice(0, 2).map((cat) => (
                            <Badge key={cat} className="bg-white/90 text-slate-900 hover:bg-white backdrop-blur-sm border-0 shadow-sm">
                              {cat}
                            </Badge>
                          ))}
                        </Box>
                      </Box>

                      {/* Content */}
                      <Box className="flex flex-col justify-center p-6 md:p-10 md:w-3/5 bg-white">
                        <Box className="mb-4 flex items-center gap-4 text-sm text-slate-500">
                          <Box className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(featuredPost.publishedAt)}
                          </Box>
                          <Box className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {estimateReadTime(featuredPost.contentHtml)}
                          </Box>
                        </Box>
                        <h3 className="mb-4 text-2xl md:text-3xl font-bold text-slate-900 transition-colors group-hover:text-blue-700 leading-tight">
                          {featuredPost.title}
                        </h3>
                        <p className="mb-6 text-slate-600 line-clamp-3 leading-relaxed">
                          {featuredPost.excerpt || "Read our comprehensive guide to improve your CELPIP score with proven strategies and expert advice."}
                        </p>
                        <Box className="mt-auto flex items-center justify-between">
                          <Box className="flex items-center gap-2">
                            <Box className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
                              <User className="h-4 w-4 text-slate-600" />
                            </Box>
                            <span className="text-sm font-medium text-slate-700">{featuredPost.authorName}</span>
                          </Box>
                          <span className="flex items-center text-sm font-bold text-blue-600 group-hover:underline">
                            Read Article <ArrowRight className="ml-1 h-4 w-4" />
                          </span>
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                </Link>
              </Box>
            )}

            {/* Recent Posts Grid */}
            {recentPosts.length > 0 && (
              <Box>
                <h2 className="mb-6 text-2xl font-bold text-slate-900">Latest Articles</h2>
                <Box className="flex flex-wrap gap-6">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex w-full flex-col md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                    >
                      <Card className="flex h-full flex-col overflow-hidden border-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-t-4 border-t-transparent hover:border-t-blue-500">
                        {/* Card Image */}
                        <Box className="relative h-48 w-full overflow-hidden bg-slate-100">
                          {post.featuredImage?.url ? (
                            <img
                              src={post.featuredImage.url}
                              alt={post.featuredImage.alt || post.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <Box className="h-full w-full flex items-center justify-center bg-slate-50">
                              <span className="text-4xl font-bold text-slate-200">Blog</span>
                            </Box>
                          )}
                          {post.categories.length > 0 && (
                            <Box className="absolute top-3 left-3">
                              <Badge className="bg-white/90 text-blue-700 hover:bg-white backdrop-blur-sm border-0 shadow-sm text-xs">
                                {post.categories[0]}
                              </Badge>
                            </Box>
                          )}
                        </Box>

                        <CardContent className="flex flex-1 flex-col p-6 bg-white">
                          <Box className="mb-3 flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(post.publishedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {estimateReadTime(post.contentHtml)}
                            </span>
                          </Box>
                          
                          <h3 className="mb-3 text-lg font-bold text-slate-900 group-hover:text-blue-700 line-clamp-2 leading-snug">
                            {post.title}
                          </h3>
                          
                          <p className="mb-4 flex-1 text-sm text-slate-600 line-clamp-3 leading-relaxed">
                            {post.excerpt || "Click to read more about this topic."}
                          </p>
                          
                          <Box className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 truncate max-w-[120px]">
                              {post.authorName}
                            </span>
                            <span className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                              Read <ChevronRight className="h-3 w-3 ml-0.5" />
                            </span>
                          </Box>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
        <BlogCtaSection />
      </Box>
    </Box>
  );
}
