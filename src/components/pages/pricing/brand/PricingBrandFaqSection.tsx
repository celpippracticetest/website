"use client";

import { pricingBrandFaqs } from "@/components/pages/pricing/pricingContent";

export function PricingBrandFaqSection() {
  return (
    <section className="px-4 pb-16 screen744:px-11 screen744:pb-[76px]">
      <div className="mx-auto max-w-[1000px]">
        <h2 className="mb-8 text-center font-display text-[1.75rem] font-extrabold tracking-[-0.01em] text-brand-navy screen744:mb-[30px] screen744:text-[1.875rem]">
          Pricing questions, answered
        </h2>

        <div className="grid grid-cols-1 gap-5 screen744:grid-cols-2 screen744:gap-x-11 screen744:gap-y-5">
          {pricingBrandFaqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="font-display text-[17px] font-bold text-brand-navy">{faq.question}</h3>
              <p className="mt-1.5 text-[15.5px] leading-[1.55] text-[#5a6874]">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
