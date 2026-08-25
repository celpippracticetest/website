import Link from "next/link";
import CalendarToday from "@mui/icons-material/CalendarToday";
import Schedule from "@mui/icons-material/Schedule";
import Person from "@mui/icons-material/Person";
import ArrowForward from "@mui/icons-material/ArrowForward";
import type { TBlogSchemaDto } from "@/models/blog.model";
import { ContentCategoryTag } from "@/components/shared/ContentCategoryTag";
import { getBlogCoverImage } from "@/lib/blog/coverImage";

interface BlogIndexContentProps {
  items: TBlogSchemaDto[];
}

function formatDate(value?: Date | string | null): string {
  if (!value) return "Draft";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Draft";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function estimateReadTime(contentHtml?: string): string {
  if (!contentHtml) return "3 min read";
  const words = contentHtml.replace(/<[^>]*>/g, " ").split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

export default function BlogIndexContent({ items }: BlogIndexContentProps) {
  const featuredPost = items.length > 0 ? items[0] : null;
  const recentPosts = items.length > 1 ? items.slice(1) : [];
  const featuredCover = featuredPost ? getBlogCoverImage(featuredPost) : null;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <section>
        <div className="mx-auto max-w-[1280px] px-4 py-12 text-center screen744:px-11 screen744:py-[72px] screen744:pb-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary5 px-3.5 py-1.5 text-[13px] font-bold text-primary1 screen744:mb-[22px]">
            <span
              className="inline-block h-[7px] w-[7px] rounded-full bg-primary1"
              aria-hidden
            />
            Exam preparation resources
          </div>

          <h1 className="text-balance text-[2rem] font-extrabold leading-[1.07] tracking-[-0.02em] text-text1 screen744:text-[2.75rem] screen1280:text-[3.125rem]">
            CELPIP <span className="text-primary1">Blog & Insights</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-[1.55] text-text2 screen744:text-[19px]">
            Expert strategies, score improvement guides, and practical tips to
            help you master the CELPIP exam.
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="border-y border-outline/60 bg-primary6/60 px-4 py-12 screen744:px-11 screen744:py-14">
        <div className="mx-auto max-w-[1280px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-outline bg-white p-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary6">
                <CalendarToday className="h-7 w-7 text-text3" aria-hidden />
              </div>
              <h2 className="text-lg font-bold text-text1">No posts yet</h2>
              <p className="mt-2 text-sm text-text2">
                Check back soon for new articles.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-12 screen744:gap-14">
              {featuredPost ? (
                <div>
                  <div className="mb-6 text-center screen744:mb-8 screen744:text-left">
                    <h2 className="text-[1.75rem] font-extrabold tracking-[-0.01em] text-text1 screen744:text-[2.125rem]">
                      Featured article
                    </h2>
                  </div>

                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="group block overflow-hidden rounded-[14px] border border-outline/80 bg-white transition-all hover:border-primary1/30 hover:shadow-[0_10px_26px_rgba(51,88,207,0.08)]"
                  >
                    <div className="flex flex-col screen1024:flex-row">
                      <div className="relative flex min-h-[220px] items-end overflow-hidden bg-primary6 p-6 screen1024:min-h-[280px] screen1024:w-2/5 screen1024:shrink-0">
                        {featuredCover ? (
                          <img
                            src={featuredCover.url}
                            alt={featuredCover.alt}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <p className="line-clamp-3 text-lg font-bold leading-snug text-text1">
                            {featuredPost.title}
                          </p>
                        )}
                        {featuredPost.categories.slice(0, 2).map((cat) => (
                          <ContentCategoryTag
                            key={cat}
                            category={cat}
                            variant="surface"
                            className="absolute left-4 top-4 z-10"
                          />
                        ))}
                      </div>

                      <div className="flex flex-1 flex-col justify-center p-6 screen744:p-8">
                        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-text3">
                          <span className="flex items-center gap-1.5">
                            <CalendarToday className="h-4 w-4" aria-hidden />
                            {formatDate(featuredPost.publishedAt)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Schedule className="h-4 w-4" aria-hidden />
                            {estimateReadTime(featuredPost.contentHtml)}
                          </span>
                        </div>

                        <h3 className="text-2xl font-extrabold leading-tight text-text1 transition-colors group-hover:text-primary1 screen744:text-[1.75rem]">
                          {featuredPost.title}
                        </h3>

                        <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-text2">
                          {featuredPost.excerpt ||
                            "Read our comprehensive guide to improve your CELPIP score with proven strategies and expert advice."}
                        </p>

                        <div className="mt-6 flex items-center justify-between gap-4 border-t border-outline/60 pt-5">
                          <span className="flex items-center gap-2 text-sm font-medium text-text2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary6">
                              <Person
                                className="h-4 w-4 text-text3"
                                aria-hidden
                              />
                            </span>
                            {featuredPost.authorName}
                          </span>
                          <span className="flex items-center gap-1 text-sm font-bold text-primary1">
                            Read article
                            <ArrowForward
                              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ) : null}

              {recentPosts.length > 0 ? (
                <div>
                  <div className="mb-8 text-center screen744:mb-10">
                    <h2 className="text-[1.75rem] font-extrabold tracking-[-0.01em] text-text1 screen744:text-[2.125rem]">
                      Latest articles
                    </h2>
                    <p className="mt-3 text-[17px] text-text2">
                      Fresh tips and strategies for every CELPIP section.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 screen744:grid-cols-2 screen1280:grid-cols-3">
                    {recentPosts.map((post) => {
                      const cover = getBlogCoverImage(post);
                      return (
                        <Link
                          key={post.id}
                          href={`/blog/${post.slug}`}
                          className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-outline/80 bg-white transition-all hover:border-primary1/30 hover:shadow-[0_10px_26px_rgba(51,88,207,0.08)]"
                        >
                          {cover ? (
                            <div className="relative h-44 w-full overflow-hidden bg-primary6">
                              <img
                                src={cover.url}
                                alt={cover.alt}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                          <div className="flex flex-1 flex-col p-6">
                            {post.categories.length > 0 ? (
                              <ContentCategoryTag
                                category={post.categories[0]}
                              />
                            ) : null}

                            <h3 className="mt-3 text-[17px] font-bold leading-snug text-text1 group-hover:text-primary1">
                              {post.title}
                            </h3>

                            <p className="mt-2 flex-1 text-[15px] leading-normal text-text2 line-clamp-3">
                              {post.excerpt ||
                                "Click to read more about this topic."}
                            </p>

                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-outline/60 pt-4 text-xs text-text3">
                              <span className="flex items-center gap-1">
                                <CalendarToday
                                  className="h-3 w-3"
                                  aria-hidden
                                />
                                {formatDate(post.publishedAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Schedule className="h-3 w-3" aria-hidden />
                                {estimateReadTime(post.contentHtml)}
                              </span>
                            </div>

                            <span className="mt-3 text-sm font-bold text-primary1 opacity-0 transition-opacity group-hover:opacity-100">
                              Read article →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
