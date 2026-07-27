interface WikiBannerProps {
  title: string;
  subtitle?: string;
  category?: string;
  /** When true, renders the index hero with brand emphasis on "Wiki". */
  isIndex?: boolean;
}

const CATEGORY_ACCENT: Record<string, string> = {
  Listening: "bg-primary1",
  Speaking: "bg-secondary2",
  Writing: "bg-success",
  Reading: "bg-error1",
  General: "bg-primary2",
};

const WikiBanner = ({
  title,
  subtitle,
  category,
  isIndex = false,
}: WikiBannerProps) => {
  const accent = category
    ? (CATEGORY_ACCENT[category] ?? "bg-primary1")
    : "bg-primary1";

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#CEDCFF_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#FFEBD6_0%,_transparent_45%)] opacity-80"
      />
      <div className="relative mx-auto max-w-[1280px] px-4 py-12 text-center screen744:px-11 screen744:py-[72px] screen744:pb-16">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary5 px-3.5 py-1.5 text-[13px] font-bold text-primary1 screen744:mb-[22px]">
          <span
            className={`inline-block h-[7px] w-[7px] rounded-full ${accent}`}
            aria-hidden
          />
          {category ? `${category} guide` : "CELPIP study wiki"}
        </div>

        {isIndex ? (
          <h1 className="text-balance text-[2rem] font-extrabold leading-[1.07] tracking-[-0.02em] text-text1 screen744:text-[2.75rem] screen1280:text-[3.125rem]">
            CELPIP <span className="text-primary1">Wiki</span>
          </h1>
        ) : (
          <h1 className="text-balance text-[1.75rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-text1 screen744:text-[2.5rem] screen1280:text-[2.875rem]">
            {title}
          </h1>
        )}

        {subtitle ? (
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-[1.55] text-text2 screen744:text-[19px]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default WikiBanner;
