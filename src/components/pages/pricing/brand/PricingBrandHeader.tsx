"use client";

import Image from "next/image";

const AVATARS = [
  { src: "/images/Carlos.png", alt: "Carlos" },
  { src: "/images/Li.png", alt: "Li" },
  { src: "/images/Tatiana.png", alt: "Tatiana" },
] as const;

const CHIPS: { label: string; glyph: string }[] = [
  { label: "60 mock exams", glyph: "▤" },
  { label: "Guide & Tips", glyph: "❋" },
  { label: "3,000+ sample tests", glyph: "≣" },
  { label: "Instant AI Feedback", glyph: "✦" },
];

type PricingBrandHeaderProps = {
  titleTag?: "h1" | "h2";
  headingId?: string;
};

export function PricingBrandHeader({
  titleTag = "h1",
  headingId,
}: PricingBrandHeaderProps = {}) {
  const TitleTag = titleTag;

  return (
    <section className="flex w-full flex-col items-center pt-0">
      <TitleTag
        id={headingId}
        className="m-0 flex flex-wrap items-center justify-center gap-3 text-center text-[28px] font-bold tracking-[-0.02em] text-[#1a2233] screen744:text-[34px]"
      >
        <span className="text-2xl leading-none text-[#4d7ef7]" aria-hidden>
          ➤
        </span>
        Pick the Plan That Fits You
      </TitleTag>

      <div className="mt-3.5 flex items-center gap-2.5">
        <div className="flex">
          {AVATARS.map((avatar, index) => (
            <div
              key={avatar.src}
              className="relative h-[26px] w-[26px] overflow-hidden rounded-full border-2 border-[#eef2f8]"
              style={{
                marginLeft: index === 0 ? 0 : -8,
                zIndex: 3 - index,
              }}
            >
              <Image
                src={avatar.src}
                alt={avatar.alt}
                fill
                className="object-cover"
                sizes="26px"
              />
            </div>
          ))}
        </div>
        <span className="text-[13px] font-medium text-[#5b6575]">
          Trusted by <strong className="font-bold text-[#1a2233]">70k+</strong>{" "}
          test-takers
        </span>
      </div>

      <div className="mt-[26px] flex flex-wrap justify-center gap-2.5">
        {CHIPS.map(({ label, glyph }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-[#e4e9f2] bg-white px-4 py-2 text-[13px] font-semibold text-[#3a4356]"
          >
            <span className="text-[#f07b4d]" aria-hidden>
              {glyph}
            </span>
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
