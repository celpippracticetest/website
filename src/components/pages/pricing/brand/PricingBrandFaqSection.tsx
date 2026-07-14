"use client";

import { pricingBrandFaqs } from "@/components/pages/pricing/pricingContent";

export function PricingBrandFaqSection() {
  return (
    <section className="w-full">
      <h2 className="mb-8 text-center text-[1.75rem] font-extrabold tracking-[-0.01em] text-[#1a2233] screen744:text-[1.875rem]">
        Pricing questions, answered
      </h2>

      <div className="grid grid-cols-1 gap-5 screen744:grid-cols-2 screen744:gap-x-11">
        {pricingBrandFaqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="text-[17px] font-bold text-[#1a2233]">
              {faq.question}
            </h3>
            <p className="mt-1.5 text-[15.5px] leading-[1.55] text-[#5b6575]">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
