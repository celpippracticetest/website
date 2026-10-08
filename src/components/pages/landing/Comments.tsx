import React from "react";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import { HOMEPAGE_TESTIMONIALS, type HomepageTestimonial } from "@/data/homepage-testimonials";
import { cn } from "@/lib/utils";
import { playOnView } from "@/hooks/usePlayOnView";
import { HOMEPAGE_USER_COUNT } from "@/data/homepage-content";

// Carlos leads as the featured review; the rest keep their data order.
const FEATURED_NAME = "Carlos";

const Stars = ({ small }: { small?: boolean }) => (
  <span role="img" aria-label="5 out of 5 stars" className="flex gap-[2px] text-[#F5B400]">
    {Array.from({ length: 5 }).map((_, index) => (
      <svg
        key={index}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={small ? "w-[13px] h-[13px] screen744:!w-[14px] screen744:!h-[14px]" : "w-[14px] h-[14px]"}
      >
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
      </svg>
    ))}
  </span>
);

const Author = ({ person, small }: { person: HomepageTestimonial; small?: boolean }) => (
  <div className="flex items-center gap-[10px] screen744:!gap-[12px]">
    <Image
      src={`/images/${person.source}`}
      alt=""
      width={44}
      height={44}
      sizes="44px"
      className={cn(
        "shrink-0 rounded-full object-cover",
        small ? "w-[40px] h-[40px] screen744:!w-[44px] screen744:!h-[44px]" : "w-[44px] h-[44px]",
      )}
    />
    <div className="flex flex-col gap-[3px]">
      <cite className={cn("not-italic font-semibold text-[#212E42]", small ? "text-[15px] screen744:!text-[16px]" : "text-[16px]")}>
        {person.name}
      </cite>
      <Stars small={small} />
    </div>
  </div>
);

const Comments = () => {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });
  const featured = HOMEPAGE_TESTIMONIALS.find((person) => person.name === FEATURED_NAME) ?? HOMEPAGE_TESTIMONIALS[0];
  const others = HOMEPAGE_TESTIMONIALS.filter((person) => person !== featured);

  return (
    <section
      ref={ref}
      aria-labelledby="reviews-heading"
      className="mx-auto w-full max-w-[1236px] px-[20px] pt-[44px] screen744:!px-[48px] screen744:!pt-[64px] screen1280:!px-[40px] screen1440:!px-0 screen1280:!pt-[88px] flex flex-col"
    >
      <h2
        id="reviews-heading"
        className="text-balance m-0 text-center text-[24px] leading-[31px] screen744:!text-[30px] screen744:!leading-[38px] screen1280:!text-[32px] screen1280:!leading-[40px] font-semibold text-[#212E42]"
      >
        Join {HOMEPAGE_USER_COUNT} Test-Takers Who Trust Us
      </h2>
      <p className="m-0 mt-[8px] text-center text-[15px] leading-[23px] screen1280:!text-[17px] screen1280:!leading-[26px] text-[#37465C]">
        What people say after practising with
        <span className="screen1280:!hidden"> us</span>
        <span className="hidden screen1280:!inline"> CELPIPPracticeTest.com</span>
      </p>

      <div className="mt-[20px] screen744:!mt-[20px] screen1280:!mt-[32px] grid grid-cols-1 screen744:!grid-cols-2 screen1280:!grid-cols-3 gap-[12px] screen744:!gap-[14px] screen1280:!gap-[20px]">
        {/* Featured review */}
        <figure
          ref={playOnView}
          data-play-delay={150}
          className={cn(
            "m-0 flex flex-col gap-[14px] p-[22px] rounded-[20px] screen1280:!rounded-[18px] border border-[#DCE5FA]",
            "bg-[linear-gradient(160deg,#FFFFFF_0%,#F2F6FF_100%)] shadow-[0_16px_36px_-22px_rgba(37,84,214,0.35)]",
            "screen744:!col-span-2 screen1280:!col-span-1 screen1280:!row-span-2 screen1280:!justify-between",
            "transition-[transform,opacity,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_22px_44px_-22px_rgba(37,84,214,0.45)] data-[play]:shadow-[0_22px_44px_-22px_rgba(37,84,214,0.45)] motion-reduce:transition-none",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[16px]",
          )}
        >
          <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true" className="hidden screen1280:!block text-[#C9D5F5]">
            <path fill="currentColor" d="M0 26V15.6C0 6.9 4.9 1.7 12.4 0l1.6 3.5C9.4 5 7.3 8.1 7.1 12H13v14H0zm20 0V15.6C20 6.9 24.9 1.7 32.4 0L34 3.5C29.4 5 27.3 8.1 27.1 12H33v14H20z" />
          </svg>
          <blockquote className="m-0 text-pretty text-[17px] leading-[26px] screen744:!text-[15px] screen744:!leading-[23px] screen1280:!text-[20px] screen1280:!leading-[31px] font-medium text-[#212E42]">
            {featured.comment}
          </blockquote>
          <Author person={featured} />
        </figure>

        {others.map((person, index) => (
          // Wrapper owns the staggered entrance so hover effects are never delayed.
          <div
            key={person.name}
            style={{ transitionDelay: inView ? `${(index + 1) * 90}ms` : "0ms" }}
            className={cn(
              "transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[16px]",
            )}
          >
            <figure ref={playOnView} data-play-delay={300 + index * 150} className="m-0 h-full flex flex-col gap-[12px] screen1280:!gap-[14px] p-[18px] screen1280:!p-[22px] rounded-[16px] screen1280:!rounded-[18px] bg-white border border-[#E8EEFB] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] data-[play]:-translate-y-[3px] hover:border-[#C9D5F5] data-[play]:border-[#C9D5F5] hover:shadow-[0_14px_28px_-18px_rgba(37,84,214,0.35)] data-[play]:shadow-[0_14px_28px_-18px_rgba(37,84,214,0.35)] motion-reduce:transition-none">
              <Author person={person} small />
              <blockquote className="m-0 text-pretty text-[14px] leading-[21px] screen1280:!text-[15px] screen1280:!leading-[23px] text-[#37465C]">
                {person.comment}
              </blockquote>
            </figure>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Comments;
