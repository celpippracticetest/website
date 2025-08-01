"use client"

import { useState, useEffect } from "react";
import Link from 'next/link'
import { ArrowRight, Search } from "lucide-react";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
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
import { wikiArticles } from "@/data/wiki";
import { useParams } from "next/navigation";

const WikiPage =() => {
  const { slug } = useParams()
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Find the current article based on the slug
  const currentArticle = wikiArticles.find(article => article.slug === slug) || wikiArticles[0];
  
  // Find the next article in sequence
  const currentIndex = wikiArticles.findIndex(article => article.slug === slug);
  const nextArticle = currentIndex < wikiArticles.length - 1 
    ? wikiArticles[currentIndex + 1] 
    : null;

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Set page title and meta description for SEO
  useEffect(() => {
    document.title = `${currentArticle.title} | CELPIP Wiki`;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', currentArticle.description || `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = currentArticle.description || `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`;
      document.head.appendChild(meta);
    }
  }, [currentArticle]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <Header />
      
      <main className="bg-slate-200 flex-grow bg-background   lg:pt-30 md:pt-20 pt-30">
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
                    {wikiArticles.map((article) => (
                      <li key={article.slug}>
                        <Link 
                          href={`/wiki/${article.slug}`}
                          className={`block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md ${
                            article.slug === slug ? 'bg-primary/10 font-medium' : ''
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
                  dangerouslySetInnerHTML={{ __html: currentArticle.content }}
                />
              </article>
              
              {/* Next Article Preview Card */}
              {nextArticle && (
                <div className="mt-12 border-t pt-8">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <Link href={`/wiki/${nextArticle.slug}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Next: {nextArticle.title}</span>
                          <ArrowRight className="h-5 w-5" />
                        </CardTitle>
                        {nextArticle.summary && (
                          <CardDescription>{nextArticle.summary}</CardDescription>
                        )}
                      </CardHeader>
                      <CardFooter>
                        <Button variant="ghost" className="ml-auto">
                          Read Next
                        </Button>
                      </CardFooter>
                    </Link>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default WikiPage;
