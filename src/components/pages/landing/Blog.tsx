import React from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { playOnView } from "@/hooks/usePlayOnView";

/** Serializable post summary passed from the server page. */
export type HomeBlogPost = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  readTime: string;
  date: string | null;
  cover: { url: string; alt: string } | null;
};

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/see:translate-x-[3px] group-data-[play]/see:translate-x-[3px]">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Meta = ({ post }: { post: HomeBlogPost }) => (
  <div className="text-[12px] screen744:!text-[13px] font-semibold text-[#5B6B82]">
    {post.category ? `${post.category} · ` : ""}
    {post.readTime}
  </div>
);

const Blog = ({ posts }: { posts: HomeBlogPost[] }) => {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

  if (posts.length === 0) return null;

  return (
    <section
      ref={ref}
      aria-labelledby="blog-heading"
      className="mx-auto w-full max-w-[1236px] px-[20px] pt-[44px] screen744:!px-[48px] screen744:!pt-[64px] screen1280:!px-[40px] screen1440:!px-0 screen1280:!pt-[88px] flex flex-col gap-[10px] screen1280:!gap-[24px]"
    >
      <div className="flex flex-col items-center screen1280:!flex-row screen1280:!items-end screen1280:!justify-between">
        <div className="flex flex-col items-center screen1280:!items-start gap-[0px] screen1280:!gap-[6px]">
          <h2
            id="blog-heading"
            className="text-balance m-0 text-[24px] leading-[31px] screen744:!text-[30px] screen744:!leading-[38px] screen1280:!text-[32px] screen1280:!leading-[40px] font-semibold text-[#212E42] text-center"
          >
            CELPIP Tips and Guides
          </h2>
          <p className="m-0 mt-[8px] screen1280:!mt-0 mb-[8px] screen1280:!mb-0 text-center text-[15px] leading-[23px] screen1280:!text-[17px] screen1280:!leading-[26px] text-[#37465C]">
            Strategies and templates from our latest articles.
          </p>
        </div>
        <Link
          href="/blog"
          ref={playOnView}
          className="group/see hidden screen1280:!flex items-center gap-[6px] h-[44px] text-[15px] font-semibold text-[#2554D6] transition-colors hover:text-[#1B3FA8] data-[play]:text-[#1B3FA8]"
        >
          See all articles
          <ArrowIcon />
        </Link>
      </div>

      <div className="grid grid-cols-1 screen744:!grid-cols-2 screen1280:!grid-cols-4 gap-[10px] screen744:!gap-[14px] screen1280:!gap-[20px]">
        {posts.map((post, index) => (
          // Wrapper owns the staggered entrance so hover effects are never delayed.
          <article
            key={post.id}
            style={{ transitionDelay: inView ? `${index * 90}ms` : "0ms" }}
            className={cn(
              "flex transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[16px]",
            )}
          >
            <Link
              ref={playOnView}
              data-play-delay={index * 150}
              href={`/blog/${post.slug}`}
              className={cn(
                "group grow flex items-center gap-[14px] p-[12px] rounded-[16px] bg-white border border-[#E8EEFB] overflow-hidden",
                "screen1280:!flex-col screen1280:!items-stretch screen1280:!gap-0 screen1280:!p-0 screen1280:!rounded-[18px]",
                "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[4px] data-[play]:-translate-y-[4px] hover:border-[#C9D5F5] data-[play]:border-[#C9D5F5] hover:shadow-[0_16px_32px_-20px_rgba(37,84,214,0.4)] data-[play]:shadow-[0_16px_32px_-20px_rgba(37,84,214,0.4)]",
                " motion-reduce:transition-none",
              )}
            >
              <div className="relative shrink-0 w-[120px] h-[65px] rounded-[10px] overflow-hidden bg-[#EEF3FF] screen1280:!w-full screen1280:!h-[150px] screen1280:!rounded-none screen1280:!border-b screen1280:!border-[#E8EEFB]">
                {post.cover ? (
                  // Absolutely filled with a forced height: globals.css sets height:auto on
                  // plain <img> (unlayered, so it beats h-full), which collapsed unloaded
                  // covers to 0px and let the browser skip them. Only 4 small covers, so eager.
                  // eslint-disable-next-line @next/next/no-img-element -- CMS images come from arbitrary hosts, same as /blog
                  <img
                    src={post.cover.url}
                    alt=""
                    decoding="async"
                    className="absolute inset-0 block w-full !h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] group-data-[play]:scale-[1.04]"
                  />
                ) : (
                  <div className="w-full h-full bg-[linear-gradient(115deg,#FCE3D5_0%,#F7F0EC_45%,#E6F6FB_100%)]" />
                )}
              </div>
              <div className="flex flex-col gap-[4px] screen1280:!gap-[8px] screen1280:!px-[20px] screen1280:!pt-[18px] screen1280:!pb-[20px]">
                <Meta post={post} />
                <h3 className="m-0 text-[15px] leading-[21px] screen1280:!text-[17px] screen1280:!leading-[24px] font-semibold text-[#212E42] line-clamp-2 transition-colors duration-300 group-hover:text-[#2554D6] group-data-[play]:text-[#2554D6]">
                  {post.title}
                </h3>
                {post.date && (
                  <div className="screen1280:!mt-[4px] text-[12px] screen744:!text-[13px] text-[#5B6B82]">{post.date}</div>
                )}
              </div>
            </Link>
          </article>
        ))}
      </div>

      <Link
        href="/blog"
        ref={playOnView}
        className="group/see flex screen1280:!hidden items-center justify-center gap-[6px] h-[44px] text-[15px] font-semibold text-[#2554D6] transition-colors hover:text-[#1B3FA8] data-[play]:text-[#1B3FA8]"
      >
        See all articles
        <ArrowIcon />
      </Link>
    </section>
  );
};

export default Blog;
