"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import Header from "@/components/header/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
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

interface WikiIndexClientProps {
  articles: TWikiArticleSchemaDto[];
}

const WikiIndexClient = ({ articles }: WikiIndexClientProps) => {
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
    ? articles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (article.description &&
            article.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : articles;

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "dark" : ""}`}>
      <Header viewMode={null} currentPage={null} />

      <main className="flex-grow bg-background lg:pt-30 md:pt-20 pt-30">
        <WikiBanner title="CELPIP Wiki: Your Comprehensive Study Guide" />

        <div className="cel-container py-6">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>CELPIP Wiki</BreadcrumbPage>
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

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Featured Articles</h2>
            <p className="text-muted-foreground">
              Browse our collection of expert guides, tips, and strategies to
              help you prepare for every section of the CELPIP exam.
            </p>
          </div>

          <Box className="mt-6 flex flex-wrap gap-6">
            {filteredArticles.map((article) => (
              <Box
                key={article.slug}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                  <Link href={`/wiki/${article.slug}`} className="block h-full">
                    <div
                      className="h-3"
                      style={{
                        background:
                          article.color ||
                          "linear-gradient(90deg, #3ebbf3, #2a80f1)",
                      }}
                    />
                    <CardHeader>
                      <CardTitle>{article.title}</CardTitle>
                      <CardDescription>
                        {article.description?.substring(0, 120)}
                        {article.description &&
                        article.description.length > 120
                          ? "..."
                          : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="border-t pt-4 flex justify-between">
                      <span className="text-[14px] text-muted-foreground">
                        {article.category || "General"}
                      </span>
                      <Button variant="ghost" size="sm" className="gap-1">
                        Read <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Link>
                </Card>
              </Box>
            ))}
          </Box>
        </div>
      </main>
    </div>
  );
};

export default WikiIndexClient;
