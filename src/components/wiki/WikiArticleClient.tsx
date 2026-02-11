"use client"

import { useState, useMemo, useEffect } from "react";
import Link from 'next/link'
import { ArrowRight, Search, BookOpen } from "lucide-react";
import Header from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import WikiBanner from "@/components/WikiBanner";
import { WikiArticle, wikiArticles } from "@/data/wiki";
import { linkContent } from "@/lib/content-linker";

interface WikiArticleClientProps {
  currentArticle: WikiArticle;
  slug: string;
}

const WikiArticleClient = ({ currentArticle, slug }: WikiArticleClientProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [linkedContent, setLinkedContent] = useState(currentArticle.content);

  // Process article content to add internal links
  useEffect(() => {
    linkContent(currentArticle.content).then(setLinkedContent);
  }, [currentArticle.content]);

  // Find the next article in sequence
  const currentIndex = wikiArticles.findIndex(article => article.slug === slug);
  const nextArticle = currentIndex < wikiArticles.length - 1
    ? wikiArticles[currentIndex + 1]
    : null;
    
  // Find related articles (same category, excluding current and next)
  const relatedArticles = useMemo(() => {
    return wikiArticles
      .filter(article => 
        article.category === currentArticle.category && 
        article.slug !== slug && 
        (!nextArticle || article.slug !== nextArticle.slug)
      )
      .slice(0, 2); // Show up to 2 related articles
  }, [currentArticle.category, slug, nextArticle]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter articles based on search query for sidebar
  const filteredArticles = wikiArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <Header viewMode={null} currentPage="wiki" />

      <main className="flex-grow bg-background lg:pt-30 md:pt-20 pt-30">
        {/* Banner with colored air movement style */}
        <WikiBanner
          title={currentArticle.title}
          color={currentArticle.color}
        />

        <div className="cel-container py-6">
          {/* Breadcrumb Navigation */}
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
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>

          {/* Main content layout - sidebar and article */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar without tablist */}
            <div className="lg:col-span-1 order-2 lg:order-1">
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
                          className={`block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md ${article.slug === slug ? 'bg-primary/10 font-medium' : ''
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

            {/* Main Article Content */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <article className="prose prose-blue dark:prose-invert max-w-none">
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: linkedContent }}
                />
              </article>

              {/* Related & Next Articles */}
              <div className="mt-12 border-t pt-8">
                <h3 className="text-2xl font-bold mb-6">Continue Reading</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Next Article Preview Card */}
                  {nextArticle && (
                    <Card className="cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col">
                      <Link href={`/wiki/${nextArticle.slug}`} className="flex flex-col h-full">
                        <CardHeader>
                          <div className="text-sm font-medium text-primary mb-2">Next Article</div>
                          <CardTitle className="flex items-center justify-between gap-2">
                            <span>{nextArticle.title}</span>
                            <ArrowRight className="h-5 w-5 flex-shrink-0" />
                          </CardTitle>
                          {nextArticle.summary && (
                            <CardDescription className="line-clamp-2">{nextArticle.summary}</CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter className="mt-auto">
                          <Button variant="ghost" className="w-full justify-start pl-0 hover:pl-2 transition-all">
                            Read Next
                          </Button>
                        </CardFooter>
                      </Link>
                    </Card>
                  )}
                  
                  {/* Related Articles */}
                  {relatedArticles.map((article) => (
                    <Card key={article.slug} className="cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col">
                      <Link href={`/wiki/${article.slug}`} className="flex flex-col h-full">
                        <CardHeader>
                          <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <BookOpen className="h-3 w-3" /> Related in {article.category}
                          </div>
                          <CardTitle>{article.title}</CardTitle>
                          {article.summary && (
                            <CardDescription className="line-clamp-2">{article.summary}</CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter className="mt-auto">
                          <Button variant="ghost" className="w-full justify-start pl-0 hover:pl-2 transition-all">
                            Read Article
                          </Button>
                        </CardFooter>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WikiArticleClient;
