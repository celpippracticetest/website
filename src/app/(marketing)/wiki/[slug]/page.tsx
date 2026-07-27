"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import WikiBanner from "@/components/WikiBanner";
import { ContentCategoryTag } from "@/components/shared/ContentCategoryTag";
import { wikiArticles } from "@/data/wiki";
import { useParams } from "next/navigation";

const WikiPage = () => {
  const { slug } = useParams();
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  const [searchQuery, setSearchQuery] = useState("");

  const currentArticle =
    wikiArticles.find((article) => article.slug === slugValue) ||
    wikiArticles[0];

  const currentIndex = wikiArticles.findIndex(
    (article) => article.slug === slugValue,
  );
  const nextArticle =
    currentIndex >= 0 && currentIndex < wikiArticles.length - 1
      ? wikiArticles[currentIndex + 1]
      : null;

  const sidebarArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return wikiArticles;
    return wikiArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.category?.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  useEffect(() => {
    document.title = `${currentArticle.title} | CELPIP Wiki`;

    const metaDescription = document.querySelector('meta[name="description"]');
    const content =
      currentArticle.description ||
      `Learn about ${currentArticle.title} in our comprehensive CELPIP guide.`;

    if (metaDescription) {
      metaDescription.setAttribute("content", content);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = content;
      document.head.appendChild(meta);
    }
  }, [currentArticle]);

  return (
    <div className="min-h-screen pb-20">
      <WikiBanner
        title={currentArticle.title}
        subtitle={currentArticle.summary || currentArticle.description}
        category={currentArticle.category}
      />

      <div className="mx-auto max-w-[1280px] px-4 py-8 screen744:px-11 screen744:py-12">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-text3"
        >
          <Link href="/" className="hover:text-text1">
            Home
          </Link>
          <span>/</span>
          <Link href="/wiki" className="hover:text-text1">
            Wiki
          </Link>
          <span>/</span>
          <span className="text-text2">{currentArticle.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="order-2 lg:order-1 lg:col-span-1">
            <div className="sticky top-28 rounded-[14px] border border-outline/80 bg-white p-5 shadow-[0_4px_16px_rgba(33,46,66,0.04)]">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.06em] text-text1">
                All guides
              </h2>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text3" />
                <input
                  type="search"
                  placeholder="Filter guides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-outline bg-primary6/40 py-2 pl-9 pr-3 text-[13px] text-text1 placeholder:text-text3 outline-none transition focus:border-primary1/40 focus:ring-2 focus:ring-primary1/15"
                />
              </div>

              <ul className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto pr-1">
                {sidebarArticles.map((article) => {
                  const isActive = article.slug === slugValue;
                  return (
                    <li key={article.slug}>
                      <Link
                        href={`/wiki/${article.slug}`}
                        className={`block rounded-xl px-3 py-2.5 text-[13px] leading-snug transition ${
                          isActive
                            ? "bg-primary5 font-bold text-primary1"
                            : "text-text2 hover:bg-primary6 hover:text-primary1"
                        }`}
                      >
                        {article.title}
                      </Link>
                    </li>
                  );
                })}
                {sidebarArticles.length === 0 ? (
                  <li className="px-3 py-2 text-[13px] text-text3">
                    No matching guides.
                  </li>
                ) : null}
              </ul>
            </div>
          </aside>

          <div className="order-1 lg:order-2 lg:col-span-3">
            <article className="overflow-hidden rounded-[14px] border border-outline/80 bg-white p-6 shadow-[0_4px_16px_rgba(33,46,66,0.04)] screen744:p-8 md:p-10">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <ContentCategoryTag
                  category={currentArticle.category || "General"}
                />
                <span className="text-sm font-medium uppercase tracking-wide text-primary1">
                  CELPIP Wiki
                </span>
              </div>

              <div
                className="article-content prose prose-blue max-w-none"
                dangerouslySetInnerHTML={{ __html: currentArticle.content }}
              />
            </article>

            {nextArticle ? (
              <Link
                href={`/wiki/${nextArticle.slug}`}
                className="group mt-8 flex items-center justify-between gap-4 rounded-[14px] border border-outline/80 bg-white p-6 transition-all hover:border-primary1/30 hover:shadow-[0_10px_26px_rgba(51,88,207,0.08)]"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.06em] text-text3">
                    Up next
                  </p>
                  <p className="mt-2 text-lg font-bold text-text1 transition-colors group-hover:text-primary1">
                    {nextArticle.title}
                  </p>
                  {nextArticle.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-text2">
                      {nextArticle.summary}
                    </p>
                  ) : null}
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary5 text-primary1 transition group-hover:bg-primary1 group-hover:text-white">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WikiPage;
