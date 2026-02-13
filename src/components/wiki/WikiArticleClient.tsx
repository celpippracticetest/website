"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, BookOpen } from "lucide-react";
import Header from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import WikiBanner from "@/components/WikiBanner";
import { Box } from "@/components/ui/Box";
import type { TWikiArticleSchemaDto } from "@/models/wiki.model";

interface WikiArticleClientProps {
  currentArticle: TWikiArticleSchemaDto;
  slug: string;
  linkedContent: string;
  allArticles: TWikiArticleSchemaDto[];
  nextArticle: TWikiArticleSchemaDto | null;
  relatedArticles: TWikiArticleSchemaDto[];
}

const WikiArticleClient = ({
  currentArticle,
  slug,
  linkedContent,
  allArticles,
  nextArticle,
  relatedArticles,
}: WikiArticleClientProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredArticles = searchQuery
    ? allArticles.filter((article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allArticles;

  return (
    <div
      className={`min-h-screen flex flex-col ${isDarkMode ? "dark" : ""}`}
    >
      <Header viewMode={null} currentPage="wiki" />

      <main className="flex-grow bg-background lg:pt-30 md:pt-20 pt-30">
        <WikiBanner
          title={currentArticle.title}
          color={currentArticle.color}
        />

        <div className="cel-container py-6">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/wiki">CELPIP Wiki</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentArticle.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search articles..."
                className="pl-8"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Button
              variant="outline"
              onClick={toggleDarkMode}
              className="w-full md:w-auto"
            >
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>

          <Box className="flex flex-col lg:flex-row gap-8">
            <Box className="w-full lg:w-1/4 order-2 lg:order-1">
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {filteredArticles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={`/wiki/${article.slug}`}
                          className={`block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md ${
                            article.slug === slug ? "bg-primary/10 font-medium" : ""
                          }`}
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Box>

            <Box className="w-full lg:w-3/4 order-1 lg:order-2">
              <article className="prose prose-blue dark:prose-invert max-w-none">
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: linkedContent }}
                />
              </article>

              <div className="mt-12 border-t pt-8">
                <h3 className="text-2xl font-bold mb-6">Continue Reading</h3>
                <Box className="flex flex-col md:flex-row gap-6">
                  {nextArticle && (
                    <Card className="cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col flex-1">
                      <Link
                        href={`/wiki/${nextArticle.slug}`}
                        className="flex flex-col h-full"
                      >
                        <CardHeader>
                          <div className="text-sm font-medium text-primary mb-2">
                            Next Article
                          </div>
                          <CardTitle className="flex items-center justify-between gap-2">
                            <span>{nextArticle.title}</span>
                            <ArrowRight className="h-5 w-5 flex-shrink-0" />
                          </CardTitle>
                          {nextArticle.summary && (
                            <CardDescription className="line-clamp-2">
                              {nextArticle.summary}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter className="mt-auto">
                          <Button
                            variant="ghost"
                            className="w-full justify-start pl-0 hover:pl-2 transition-all"
                          >
                            Read Next
                          </Button>
                        </CardFooter>
                      </Link>
                    </Card>
                  )}

                  {relatedArticles.map((article) => (
                    <Card
                      key={article.slug}
                      className="cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col flex-1"
                    >
                      <Link
                        href={`/wiki/${article.slug}`}
                        className="flex flex-col h-full"
                      >
                        <CardHeader>
                          <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <BookOpen className="h-3 w-3" /> Related in{" "}
                            {article.category}
                          </div>
                          <CardTitle>{article.title}</CardTitle>
                          {article.summary && (
                            <CardDescription className="line-clamp-2">
                              {article.summary}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter className="mt-auto">
                          <Button
                            variant="ghost"
                            className="w-full justify-start pl-0 hover:pl-2 transition-all"
                          >
                            Read Article
                          </Button>
                        </CardFooter>
                      </Link>
                    </Card>
                  ))}
                </Box>
              </div>
            </Box>
          </Box>
        </div>
      </main>
    </div>
  );
};

export default WikiArticleClient;
