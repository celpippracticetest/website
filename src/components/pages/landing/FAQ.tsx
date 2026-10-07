import React, { useState } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { cn } from "@/lib/utils";

type Faq = { question: string; answer: string; render?: React.ReactNode };

const faqs: Faq[] = [
  {
    question: "Is CELPIPPracticeTest.com free?",
    answer:
      "Yes. You can start practising for free, with no credit card required. A paid plan unlocks the full library of mock exams and more AI-scored Writing and Speaking tasks. See Pricing for current plans.",
    render: (
      <>
        Yes. You can start practising for free, with no credit card required. A paid plan unlocks the full library of
        mock exams and more AI-scored Writing and Speaking tasks. See{" "}
        <Link href="/pricing" className="font-semibold text-[#2554D6] underline-offset-2 hover:underline">
          Pricing
        </Link>{" "}
        for current plans.
      </>
    ),
  },
  {
    question: "Can I take a full CELPIP mock test online?",
    answer:
      "Yes. Our full-length mock exams cover Listening, Reading, Writing and Speaking with the same task types and timing as the CELPIP-General test, so you can practise under test-day conditions.",
  },
  {
    question: "How are Writing and Speaking answers scored?",
    answer:
      "AI scores your answers on the official CELPIP rating criteria, such as Content/Coherence, Vocabulary and Task Fulfillment. You get an estimated level out of 12 and clear tips to improve. Scores are estimates, not official results.",
  },
  {
    question: "How do CELPIP scores convert to CLB levels?",
    answer:
      "CELPIP levels match CLB levels one to one from 4 to 9, and CELPIP 10 to 12 count as CLB 10. For example, a CELPIP 9 in a skill equals CLB 9 in that skill.",
  },
  {
    question: "Do Listening and Reading come with answer keys?",
    answer:
      "Yes. Listening and Reading are scored instantly, with a full answer key so you can see why each answer is right or wrong.",
  },
  {
    question: "Can I practise on my phone?",
    answer: "Yes. The website works on any phone or tablet, and you can also practise with our Android app.",
  },
  {
    question: "Is CELPIPPracticeTest.com affiliated with the official CELPIP test?",
    answer:
      "No. We are an independent platform and are not affiliated with or endorsed by Paragon Testing Enterprises. To book the official test, visit celpip.ca.",
  },
  {
    question: "Is CELPIP or IELTS better for Canadian immigration?",
    answer:
      "Both CELPIP-General and IELTS General Training are accepted by IRCC for Express Entry and citizenship. CELPIP is fully computer-based, done in one sitting and uses Canadian English, which many test-takers prefer. Choose the format that suits you best.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const FAQ = () => {
  // First question starts open, as in the design; only one is open at a time.
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="faq-heading"
      className="mx-auto w-full max-w-[1000px] px-[20px] pt-[44px] screen744:!px-[48px] screen744:!pt-[64px] screen1280:!px-0 screen1280:!pt-[88px] flex flex-col"
    >
      <JsonLd data={faqSchema} />
      <h2
        id="faq-heading"
        className="m-0 mb-[20px] screen1280:!mb-[32px] text-center text-[24px] leading-[31px] screen744:!text-[30px] screen744:!leading-[38px] screen1280:!text-[32px] screen1280:!leading-[40px] font-semibold text-[#212E42]"
      >
        CELPIP Practice Test FAQs
      </h2>

      <div className="flex flex-col gap-[10px] screen1280:!gap-[12px]">
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          const panelId = `faq-panel-${index}`;
          const buttonId = `faq-button-${index}`;
          return (
            <div
              key={faq.question}
              className={cn(
                "rounded-[14px] border overflow-hidden transition-[background-color,border-color,box-shadow] duration-300",
                open
                  ? "bg-white border-[#C9D5F5] shadow-[0_10px_28px_-20px_rgba(37,84,214,0.45)]"
                  : "bg-white/70 border-[#E3E8F2] hover:bg-white hover:border-[#C9D5F5]",
              )}
            >
              <h3 className="m-0">
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className={cn(
                    "group w-full flex items-center justify-between gap-[16px] min-h-[64px] px-[18px] py-[16px] screen1280:!min-h-[66px] screen1280:!px-[24px] screen1280:!py-[18px]",
                    "text-left text-[15px] screen1280:!text-[17px] leading-[1.4] text-[#212E42] cursor-pointer outline-none",
                    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2554D6] rounded-[14px]",
                    open ? "font-semibold" : "font-medium",
                  )}
                >
                  {faq.question}
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center w-[28px] h-[28px] rounded-full transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      open ? "rotate-180 bg-[#EEF3FF] text-[#2554D6]" : "text-[#37465C] group-hover:bg-[#EEF3FF] group-hover:text-[#2554D6]",
                    )}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </h3>
              {/* grid-rows trick animates height without measuring */}
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden" inert={!open || undefined}>
                  <p className="m-0 px-[18px] pb-[18px] screen1280:!px-[24px] screen1280:!pb-[22px] text-[14px] leading-[22px] screen1280:!text-[16px] screen1280:!leading-[26px] text-[#37465C]">
                    {faq.render ?? faq.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="m-0 mt-[14px] screen1280:!mt-[24px] text-center text-[14px] screen1280:!text-[15px] text-[#5B6B82]">
        Still have a question?{" "}
        <Link href="/contact-us" className="font-semibold text-[#2554D6] underline-offset-2 hover:underline">
          Contact us
        </Link>
      </p>
    </section>
  );
};

export default FAQ;
