"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
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
import { wikiArticles } from "@/data/wiki";

const WikiIndex = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter articles based on search query
  const filteredArticles = searchQuery
    ? wikiArticles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : wikiArticles;

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "dark" : ""}`}>
      <Header />

      <main className="bg-slate-200 flex-grow bg-background   lg:pt-30 md:pt-20 pt-30">
        {/* Banner with colored air movement style */}
        <WikiBanner title="CELPIP Wiki: Your Comprehensive Study Guide" />

        <div className="cel-container py-6">
          {/* Breadcrumb Navigation */}
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

          {/* Search and Dark Mode Controls */}
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

          {/* Articles without the tablist */}
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Card
                  key={article.slug}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link href={`/wiki/${article.slug}`}>
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
                        {article.description && article.description.length > 120
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
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WikiIndex;
