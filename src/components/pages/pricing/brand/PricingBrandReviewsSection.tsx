"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { pricingTestimonials } from "@/components/pages/pricing/pricingContent";

const Svg5Star = dynamic(() => import("@/components/icons/5Star"), {
  ssr: false,
});

export function PricingBrandReviewsSection() {
  return (
    <section className="mt-12 w-full screen744:mt-14">
      <div className="grid grid-cols-1 gap-4 screen744:grid-cols-2 screen1280:grid-cols-4">
        {pricingTestimonials.map((t) => (
          <article
            key={t.name}
            className="flex h-full flex-col gap-3 rounded-xl border border-[#e4e9f2] bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Image
                src={`/images/${t.source}`}
                alt={t.name}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
              <div>
                <h4 className="text-sm font-bold text-[#1a2233]">{t.name}</h4>
                <Svg5Star />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-[#5b6575]">
              {t.comment}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
