import Link from "next/link";
import { ArrowRight, Search, BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Box } from "@/components/ui/Box";
import type { TWikiArticleSchemaDto } from "@/models/wiki.model";

interface WikiArticleContentProps {
  currentArticle: TWikiArticleSchemaDto;
  slug: string;
  linkedContent: string;
  filteredArticles: TWikiArticleSchemaDto[];
  nextArticle: TWikiArticleSchemaDto | null;
  relatedArticles: TWikiArticleSchemaDto[];
  sidebarSearchQuery: string;
}

export default function WikiArticleContent({
  currentArticle,
  slug,
  linkedContent,
  filteredArticles,
  nextArticle,
  relatedArticles,
  sidebarSearchQuery,
}: WikiArticleContentProps) {
  return (
    <Box className="min-h-screen bg-slate-50 pb-20">
      {/* Hero */}
      <Box className="relative isolate overflow-hidden border-b border-slate-200 bg-white pb-12 pt-16">
        <Box className="pointer-events-none absolute inset-0 -z-10 opacity-30">
          <Box className="absolute -left-10 -top-10 h-96 w-96 rounded-full bg-blue-100 blur-3xl" />
          <Box className="absolute right-0 top-20 h-80 w-80 rounded-full bg-indigo-50 blur-3xl" />
        </Box>
        <Box className="cel-container relative z-10">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-slate-600 hover:text-slate-900">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/wiki" className="text-slate-600 hover:text-slate-900">
                  CELPIP Wiki
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-slate-900">
                  {currentArticle.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1
            className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
            style={{
              borderLeftColor: currentArticle.color || "#3b82f6",
              borderLeftWidth: "4px",
              borderLeftStyle: "solid",
              paddingLeft: "1rem",
            }}
          >
            {currentArticle.title}
          </h1>
        </Box>
      </Box>

      <Box className="cel-container mt-8">
        <Box className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar - form GET to current path so ?q= filters on server */}
          <Box className="w-full shrink-0 lg:order-1 lg:w-64">
            <div className="sticky top-24 space-y-4">
              <form method="get" action={`/wiki/${slug}`} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  name="q"
                  placeholder="Search articles..."
                  defaultValue={sidebarSearchQuery}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </form>
              <Card className="border-0 shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    All Articles
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <ul className="space-y-1">
                    {filteredArticles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={`/wiki/${article.slug}`}
                          className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                            article.slug === slug
                              ? "bg-blue-50 font-medium text-blue-700"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </Box>

          {/* Article + Continue Reading */}
          <Box className="min-w-0 flex-1 lg:order-2">
            <Box className="mx-auto max-w-3xl overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
              <article className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-blue-600 prose-strong:text-slate-900">
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: linkedContent }}
                />
              </article>
            </Box>

            <Box className="mx-auto mt-12 max-w-3xl">
              <h3 className="mb-6 text-xl font-bold text-slate-900">
                Continue Reading
              </h3>
              <Box className="flex flex-col gap-4 md:flex-row">
                {nextArticle && (
                  <Link
                    href={`/wiki/${nextArticle.slug}`}
                    className="group flex flex-1"
                  >
                    <Card className="h-full w-full border-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <CardHeader>
                        <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                          Next Article
                        </p>
                        <CardTitle className="flex items-center justify-between gap-2 text-lg group-hover:text-blue-700">
                          <span className="line-clamp-2">{nextArticle.title}</span>
                          <ArrowRight className="h-5 w-5 shrink-0" />
                        </CardTitle>
                        {nextArticle.summary && (
                          <CardDescription className="line-clamp-2 text-sm">
                            {nextArticle.summary}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                )}
                {relatedArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/wiki/${article.slug}`}
                    className="group flex flex-1"
                  >
                    <Card className="h-full w-full border-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <CardHeader>
                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <BookOpen className="h-3 w-3" /> {article.category}
                        </p>
                        <CardTitle className="text-lg group-hover:text-blue-700 line-clamp-2">
                          {article.title}
                        </CardTitle>
                        {article.summary && (
                          <CardDescription className="line-clamp-2 text-sm">
                            {article.summary}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
