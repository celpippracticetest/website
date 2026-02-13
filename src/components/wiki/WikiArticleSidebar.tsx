"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TWikiArticleSchemaDto } from "@/models/wiki.model";

interface WikiArticleSidebarProps {
  allArticles: TWikiArticleSchemaDto[];
  slug: string;
}

export default function WikiArticleSidebar({
  allArticles,
  slug,
}: WikiArticleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = searchQuery
    ? allArticles.filter((article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allArticles;

  return (
    <div className="sticky top-24 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Search articles..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
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
  );
}
