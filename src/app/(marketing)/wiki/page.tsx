"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import WikiBanner from "@/components/WikiBanner";
import { ContentCategoryTag } from "@/components/shared/ContentCategoryTag";
import { wikiArticles } from "@/data/wiki";

const CATEGORY_ORDER = [
  "General",
  "Listening",
  "Reading",
  "Writing",
  "Speaking",
] as const;

const WikiIndex = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const present = new Set(wikiArticles.map((a) => a.category || "General"));
    return [
      "All",
      ...CATEGORY_ORDER.filter((c) => present.has(c)),
      ...[...present].filter(
        (c) => !(CATEGORY_ORDER as readonly string[]).includes(c),
      ),
    ];
  }, []);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return wikiArticles.filter((article) => {
      const matchesCategory =
        activeCategory === "All" ||
        (article.category || "General") === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.description?.toLowerCase().includes(q) ||
        article.category?.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="min-h-screen pb-20">
      <WikiBanner
        isIndex
        title="CELPIP Wiki"
        subtitle="Expert guides, tips, and strategies to help you prepare for every section of the CELPIP exam."
      />

      <section className="border-y border-outline/60 bg-primary6/60 px-4 py-12 screen744:px-11 screen744:py-14">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-8 flex flex-col gap-4 screen744:mb-10 screen744:flex-row screen744:items-center screen744:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text3" />
              <input
                type="search"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-outline bg-white py-2.5 pl-10 pr-4 text-[15px] text-text1 placeholder:text-text3 shadow-[0_2px_8px_rgba(33,46,66,0.04)] outline-none transition focus:border-primary1/40 focus:ring-2 focus:ring-primary1/15"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
                      isActive
                        ? "bg-primary1 text-white shadow-[0_4px_12px_rgba(49,107,255,0.25)]"
                        : "bg-white text-text3 border border-outline hover:border-primary1/30 hover:text-primary1"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-8 text-center screen744:mb-10">
            <h2 className="text-[1.75rem] font-extrabold tracking-[-0.01em] text-text1 screen744:text-[2.125rem]">
              {activeCategory === "All"
                ? "All articles"
                : `${activeCategory} articles`}
            </h2>
            <p className="mt-3 text-[17px] text-text2">
              {filteredArticles.length} guide
              {filteredArticles.length === 1 ? "" : "s"} to boost your score.
            </p>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-outline bg-white p-12 text-center">
              <h3 className="text-lg font-bold text-text1">
                No articles found
              </h3>
              <p className="mt-2 text-sm text-text2">
                Try a different search or category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 screen744:grid-cols-2 screen1280:grid-cols-3">
              {filteredArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/wiki/${article.slug}`}
                  className="group flex h-full flex-col rounded-[14px] border border-outline/80 bg-white p-6 transition-all hover:border-primary1/30 hover:shadow-[0_10px_26px_rgba(51,88,207,0.08)]"
                >
                  <ContentCategoryTag
                    category={article.category || "General"}
                  />

                  <h3 className="mt-3 text-[17px] font-bold leading-snug text-text1 transition-colors group-hover:text-primary1">
                    {article.title}
                  </h3>

                  <p className="mt-2 flex-1 text-[15px] leading-normal text-text2 line-clamp-3">
                    {article.description ||
                      "Click to read more about this topic."}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1 border-t border-outline/60 pt-4 text-sm font-bold text-primary1">
                    Read guide
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default WikiIndex;
