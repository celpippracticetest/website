import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { trackCTAClick } from "@/lib/analytics";
import RollingWords from "./RollingWords";

const Practice = () => {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <section
      ref={ref}
      aria-labelledby="cta-heading"
      className="mx-auto w-full max-w-[1236px] px-[20px] pt-[110px] screen744:!px-[48px] screen744:!pt-[130px] screen1280:!px-[40px] screen1440:!px-0 screen1280:!pt-[120px]"
    >
      {/* The header hides its own Start button while this card is on screen. */}
      <div
        id="home-cta"
        className={cn(
          "relative flex flex-col items-center text-center rounded-[28px] px-[22px] pt-[96px] pb-[28px]",
          "screen744:!rounded-[36px] screen744:!px-[48px] screen744:!pt-[112px] screen744:!pb-[36px]",
          "screen1280:!items-start screen1280:!text-left screen1280:!justify-center screen1280:!h-[256px] screen1280:!rounded-[40px] screen1280:!px-[80px] screen1280:!py-0",
          "bg-[radial-gradient(80%_120%_at_50%_40%,#E2592B_0%,#F07B50_100%)] screen1280:!bg-[radial-gradient(60%_260%_at_50%_50%,#E2592B_0%,#F07B50_100%)]",
        )}
      >
        {/* Mascot: centred above the card on mobile/tablet, standing on the right edge on desktop */}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 top-[-84px] w-[140px] h-[169px] screen744:!top-[-110px] screen744:!w-[170px] screen744:!h-[205px]",
            "screen1280:!left-auto screen1280:!translate-x-0 screen1280:!top-auto screen1280:!right-[110px] screen1280:!bottom-0 screen1280:!w-[250px] screen1280:!h-[302px]",
            "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            inView ? "opacity-100" : "opacity-0 translate-y-[12px]",
          )}
        >
          <Image
            src="/images/hero.png"
            alt=""
            width={250}
            height={302}
            sizes="(max-width: 743px) 140px, (max-width: 1279px) 170px, 250px"
            className="w-full h-full object-cover object-top transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-rotate-3 hover:-translate-y-[4px]"
          />
        </div>

        <h2
          id="cta-heading"
          className="m-0 text-[26px] leading-[32px] screen744:!text-[32px] screen744:!leading-[40px] screen1280:!text-[34px] screen1280:!leading-[42px] screen1280:!w-[640px] font-bold text-white"
        >
          Ready to reach your target CLB?
        </h2>
        <p className="m-0 mt-[8px] screen1280:!mt-[10px] text-[16px] leading-[24px] screen1280:!text-[18px] screen1280:!leading-[27px] screen1280:!w-[600px] font-semibold text-white">
          Take a free practice test and get your first AI score in minutes.
        </p>

        <div className="mt-[20px] screen744:!mt-[24px] screen1280:!mt-[26px] self-stretch screen744:!self-auto flex flex-col items-center gap-[12px] screen1280:!flex-row screen1280:!gap-[22px]">
          <Link
            href="/practice-overview"
            onClick={() =>
              trackCTAClick("Start Free Practice", "cta_banner", {
                itemId: "cta_banner_start",
              })
            }
            className={cn(
              "group/start flex items-center justify-center gap-[8px] h-[54px] w-full screen744:!w-[290px] screen744:!h-[55px] screen1280:!w-[260px] rounded-full",
              "bg-white text-[#2554D6] text-[17px] screen1280:!text-[18px] font-semibold whitespace-nowrap shadow-[3.7px_3.9px_0_0_#B8431B]",
              "transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "hover:-translate-y-[2px] hover:shadow-[5px_6px_0_0_#B8431B] hover:bg-[#F4F7FF]",
              "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#B8431B] active:duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#E2592B]",
              "motion-reduce:transition-none",
            )}
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/start:rotate-90"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <RollingWords text="Start Free Practice" />
          </Link>
          <div className="flex items-center gap-[6px] screen1280:!gap-[8px] text-[14px] screen1280:!text-[16px] font-semibold text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="screen1280:!w-[18px] screen1280:!h-[18px]">
              <path d="M5 12l5 5L20 7" />
            </svg>
            No credit card required
          </div>
        </div>
      </div>
    </section>
  );
};

export default Practice;
