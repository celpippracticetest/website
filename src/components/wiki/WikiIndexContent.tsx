import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Box } from "@/components/ui/Box";
import type { TWikiArticleSchemaDto } from "@/models/wiki.model";

interface WikiIndexContentProps {
  articles: TWikiArticleSchemaDto[];
  searchQuery: string;
}

export default function WikiIndexContent({
  articles,
  searchQuery,
}: WikiIndexContentProps) {
  return (
    <Box className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section */}
      <Box className="relative isolate overflow-hidden border-b border-slate-200 bg-white pb-16 pt-24">
        <Box className="pointer-events-none absolute inset-0 -z-10 opacity-30">
          <Box className="absolute -left-10 -top-10 h-96 w-96 rounded-full bg-blue-100 blur-3xl" />
          <Box className="absolute right-0 top-20 h-80 w-80 rounded-full bg-indigo-50 blur-3xl" />
        </Box>
        <Box className="cel-container relative z-10 text-center">
          <Badge className="mb-6 border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100">
            Study Guides & Strategies
          </Badge>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
            CELPIP <span className="text-blue-600">Wiki</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
            Expert guides, tips, and strategies for every section of the CELPIP
            exam.
          </p>
        </Box>
      </Box>

      <Box className="cel-container mt-12">
        {/* Search - form submits via GET so server re-renders with ?q= */}
        <Box className="mb-8">
          <form method="get" action="/wiki" className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              placeholder="Search articles..."
              defaultValue={searchQuery}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </form>
        </Box>

        {articles.length === 0 ? (
          <Box className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No articles found
            </h3>
            <p className="text-slate-500">
              {searchQuery
                ? "Try a different search."
                : "No wiki articles yet."}
            </p>
          </Box>
        ) : (
          <Box>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">
              Featured Articles
            </h2>
            <Box className="flex flex-wrap gap-6">
              {articles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/wiki/${article.slug}`}
                  className="group flex w-full flex-col md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                >
                  <Card className="flex h-full flex-col overflow-hidden border-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-t-4 border-t-transparent hover:border-t-blue-500">
                    <Box
                      className="h-2 w-full shrink-0"
                      style={{
                        background:
                          article.color ||
                          "linear-gradient(90deg, #3ebbf3, #2a80f1)",
                      }}
                    />
                    <CardHeader className="pb-2">
                      <Box className="mb-2">
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs">
                          {article.category || "General"}
                        </Badge>
                      </Box>
                      <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-700">
                        {article.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pb-4">
                      <CardDescription className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                        {article.description?.substring(0, 160) ||
                          article.summary?.substring(0, 160) ||
                          "Read this guide."}
                        {(article.description?.length ?? 0) > 160 && "..."}
                      </CardDescription>
                    </CardContent>
                    <CardFooter className="mt-auto border-t border-slate-100 pt-4">
                      <span className="flex items-center text-sm font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5">
                        Read <ChevronRight className="ml-0.5 h-4 w-4" />
                      </span>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
