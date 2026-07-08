"use client";

type PricingBrandHeaderProps = {
  titleTag?: "h1" | "h2";
  headingId?: string;
};

export function PricingBrandHeader({ titleTag = "h1", headingId }: PricingBrandHeaderProps = {}) {
  const TitleTag = titleTag;

  return (
    <section className="bg-[linear-gradient(180deg,#f7f9fb_0%,#ffffff_100%)] px-4 pb-2 pt-12 text-center screen744:px-11 screen744:pb-0 screen744:pt-[66px]">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-blue-tint px-3.5 py-1.5 text-[13px] font-bold text-brand-blue-dark">
          <span className="inline-block h-[7px] w-[7px] rounded-full bg-brand-blue" aria-hidden />
          Free to start · no credit card required
        </div>

        <TitleTag
          id={headingId}
          className="font-display text-balance text-[2rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-brand-navy screen744:mx-auto screen744:max-w-[720px] screen744:text-[2.875rem]"
        >
          Simple, transparent pricing
        </TitleTag>

        <p className="mx-auto mt-4 max-w-[600px] text-[17px] leading-[1.55] text-text2 screen744:mt-4 screen744:text-[19px]">
          Try everything free for 3 days, then pick the plan that gets you to your target CLB.
          Cancel anytime.
        </p>

        <div className="mt-8 screen744:mt-[34px]">
          <span className="inline-flex items-center rounded-full bg-[#eaf3ee] px-3 py-1.5 text-[13px] font-bold text-[#1f8a5f]">
            Intro pricing on your first billing period
          </span>
        </div>
      </div>
    </section>
  );
}
