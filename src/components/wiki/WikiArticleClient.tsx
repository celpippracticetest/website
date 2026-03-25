import Link from "next/link";
import ArrowForward from "@mui/icons-material/ArrowForward";
import MenuBook from "@mui/icons-material/MenuBook";
import {
  Card,
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
import WikiArticleSidebar from "@/components/wiki/WikiArticleSidebar";
import type { TWikiArticleSchemaDto } from "@/models/wiki.model";

interface WikiArticleClientProps {
  currentArticle: TWikiArticleSchemaDto;
  slug: string;
  linkedContent: string;
  allArticles: TWikiArticleSchemaDto[];
  nextArticle: TWikiArticleSchemaDto | null;
  relatedArticles: TWikiArticleSchemaDto[];
}

export default function WikiArticleClient({
  currentArticle,
  slug,
  linkedContent,
  allArticles,
  nextArticle,
  relatedArticles,
}: WikiArticleClientProps) {
  return (
    <Box className="min-h-screen bg-slate-50 pb-20">
      {/* Hero - same pattern as blog / wiki index */}
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
          {/* Sidebar - client island for search */}
          <Box className="w-full shrink-0 lg:order-1 lg:w-64">
            <WikiArticleSidebar allArticles={allArticles} slug={slug} />
          </Box>

          {/* Article + Continue Reading */}
          <Box className="min-w-0 flex-1 lg:order-2">
            <Box className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
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
                          <ArrowForward className="h-5 w-5 shrink-0" />
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
                          <MenuBook className="h-3 w-3" /> {article.category}
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
