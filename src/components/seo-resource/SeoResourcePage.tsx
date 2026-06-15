import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import type { SeoResourcePage as SeoResourcePageData } from "@/data/seo-resource-pages";

const BASE_URL = "https://celpippracticetest.com";
const skillLinks = [
  { label: "Listening", href: "/listening", className: "bg-primary5 text-primary1" },
  { label: "Reading", href: "/reading", className: "bg-error5 text-error1" },
  { label: "Writing", href: "/writing", className: "bg-success5 text-success" },
  { label: "Speaking", href: "/speaking", className: "bg-secondary5 text-secondary2" },
];

export default function SeoResourcePage({ page }: { page: SeoResourcePageData }) {
  const pageUrl = `${BASE_URL}/${page.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: page.h1,
        description: page.description,
        dateModified: page.lastModified,
        datePublished: page.lastModified,
        author: {
          "@type": "Organization",
          name: "CELPIP Practice Test",
        },
        publisher: {
          "@type": "Organization",
          name: "CELPIP Practice Test",
          logo: {
            "@type": "ImageObject",
            url: `${BASE_URL}/images/logo.png`,
          },
        },
        mainEntityOfPage: pageUrl,
      },
      {
        "@type": "FAQPage",
        mainEntity: [page.quickAnswer, ...page.faqs].map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: BASE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: page.h1,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#F8FAFF] pb-20">
      <JsonLd data={schema} />
      <section className="relative border-b border-[#E8EDFF] bg-[linear-gradient(135deg,#F8FAFF_0%,#EEF4FF_48%,#F5FBF8_100%)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-[-120px] top-[-140px] h-[360px] w-[360px] rounded-full bg-primary5 blur-3xl" />
          <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-secondary5 blur-3xl" />
        </div>
        <div className="relative z-[1] mx-auto grid max-w-[1160px] gap-8 px-4 py-12 screen744:px-8 screen1024:grid-cols-[1.1fr_0.9fr] screen1024:items-center screen1280:py-16">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-sm font-semibold text-primary1 shadow-sm">
              CELPIP Practice Resource
            </p>
            <h1 className="mb-5 text-balance text-[2.5rem] font-extrabold leading-[1.08] text-text1 screen744:text-[3.25rem]">
              {page.h1}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-text2 screen744:text-lg">
              {page.intro}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={page.primaryCta.href}
                className="inline-flex min-h-[48px] items-center rounded-xl bg-primary1 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(49,107,255,0.65)] transition-colors hover:bg-primary2"
              >
                {page.primaryCta.label}
              </Link>
              {page.secondaryCta ? (
                <Link
                  href={page.secondaryCta.href}
                  className="inline-flex min-h-[48px] items-center rounded-xl border border-[#DDE6FF] bg-white/90 px-5 py-3 text-sm font-semibold text-text1 shadow-sm transition-colors hover:border-primary1 hover:text-primary1"
                >
                  {page.secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-30px_rgba(49,107,255,0.35)] backdrop-blur">
            <p className="mb-2 text-sm font-semibold uppercase text-primary1">
              Quick Answer
            </p>
            <h2 className="mb-3 text-[22px] font-bold leading-snug text-text1">
              {page.quickAnswer.question}
            </h2>
            <p className="leading-relaxed text-text2">{page.quickAnswer.answer}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {skillLinks.map((skill) => (
                <Link
                  key={skill.href}
                  href={skill.href}
                  className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${skill.className}`}
                >
                  {skill.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 pt-10 screen744:px-8 screen744:pt-14">
        <section className="mb-8 rounded-[24px] border border-[#E8EDFF] bg-white p-5 shadow-sm screen744:p-6">
          <div className="grid gap-4 screen744:grid-cols-4">
            <div>
              <p className="text-[22px] font-bold text-text1">4</p>
              <p className="text-sm text-text2">CELPIP skills</p>
            </div>
            <div>
              <p className="text-[22px] font-bold text-text1">Timed</p>
              <p className="text-sm text-text2">Practice flow</p>
            </div>
            <div>
              <p className="text-[22px] font-bold text-text1">AI</p>
              <p className="text-sm text-text2">Writing and speaking feedback</p>
            </div>
            <div>
              <p className="text-[22px] font-bold text-text1">Free</p>
              <p className="text-sm text-text2">Start without a card</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          {page.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[24px] border border-[#E8EDFF] bg-white p-5 shadow-sm screen744:p-6"
            >
              <h2 className="mb-3 text-[24px] font-bold text-text1">
                {section.title}
              </h2>
              <p className="leading-relaxed text-text2">{section.body}</p>
              {section.bullets?.length ? (
                <ul className="mt-4 grid gap-2 text-text2 screen744:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="rounded-xl border border-[#E8EDFF] bg-[#F8FAFF] px-4 py-3 text-sm leading-relaxed"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {page.samples?.length ? (
          <section className="mt-8">
            <h2 className="mb-4 text-[26px] font-bold text-text1">
              Sample Answers
            </h2>
            <div className="grid gap-6">
              {page.samples.map((sample) => (
                <article
                  key={sample.title}
                  className="rounded-[24px] border border-[#E8EDFF] bg-white p-5 shadow-sm screen744:p-6"
                >
                  <h3 className="mb-3 text-[20px] font-bold text-text1">
                    {sample.title}
                  </h3>
                  <div className="mb-4 rounded-2xl bg-[#F2F6FF] p-4">
                    <p className="mb-1 text-sm font-semibold text-text1">Prompt</p>
                    <p className="text-sm leading-relaxed text-text2">{sample.prompt}</p>
                  </div>
                  <pre className="mb-4 whitespace-pre-wrap rounded-2xl border border-[#DDE6FF] bg-white p-4 font-sans text-sm leading-relaxed text-[#37465C]">
                    {sample.answer}
                  </pre>
                  <ul className="space-y-2 text-sm text-text2">
                    {sample.notes.map((note) => (
                      <li key={note} className="rounded-xl bg-[#F8FAFF] px-4 py-2">
                        {note}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-[24px] border border-[#E8EDFF] bg-white p-5 shadow-sm screen744:p-6">
          <h2 className="mb-4 text-[24px] font-bold text-text1">FAQs</h2>
          <div className="grid gap-4">
            {page.faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl bg-[#F8FAFF] p-4">
                <h3 className="font-semibold text-text1">{faq.question}</h3>
                <p className="mt-1 leading-relaxed text-text2">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[28px] bg-[linear-gradient(135deg,#316BFF_0%,#6C5CE7_52%,#0D9488_100%)] p-[1px]">
          <div className="rounded-[27px] bg-white px-5 py-6 screen744:flex screen744:items-center screen744:justify-between screen744:gap-6 screen744:px-7">
            <div>
              <h2 className="text-[24px] font-bold text-text1">Ready to practice?</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text2">
                Start with one skill, review your feedback, then move into a full mock exam when you are ready.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 screen744:mt-0">
              <Link
                href={page.primaryCta.href}
                className="inline-flex min-h-[48px] items-center rounded-xl bg-primary1 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary2"
              >
                {page.primaryCta.label}
              </Link>
              {page.secondaryCta ? (
                <Link
                  href={page.secondaryCta.href}
                  className="inline-flex min-h-[48px] items-center rounded-xl border border-[#DDE6FF] bg-white px-5 py-3 text-sm font-semibold text-text1 transition-colors hover:border-primary1 hover:text-primary1"
                >
                  {page.secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
