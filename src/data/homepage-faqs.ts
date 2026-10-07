export type HomepageFaq = {
  question: string;
  answer: string;
};

/**
 * Homepage FAQ — the single source for both the visible accordion and the
 * FAQPage JSON-LD, so the two never drift. Copy from the design handoff
 * (data/faq.json).
 */
export const HOMEPAGE_FAQS: HomepageFaq[] = [
  {
    question: "Is CELPIPPracticeTest.com free?",
    answer:
      "Yes. You can start practising for free, with no credit card required. A paid plan unlocks the full library of mock exams and more AI-scored Writing and Speaking tasks. See Pricing for current plans.",
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

/** FAQPage JSON-LD generated from the same data the accordion renders. */
export function buildHomepageFaqJsonLd(baseUrl = "https://celpippracticetest.com") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${baseUrl}/#faq`,
    mainEntity: HOMEPAGE_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
