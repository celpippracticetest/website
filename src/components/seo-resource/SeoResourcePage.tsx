import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import type { SeoResourcePage as SeoResourcePageData } from "@/data/seo-resource-pages";

const BASE_URL = "https://celpippracticetest.com";

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
    <main className="min-h-screen bg-[#F2F6FF] pb-20">
      <JsonLd data={schema} />
      <section className="mx-auto max-w-[1040px] px-4 pt-10 screen744:pt-14">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase text-primary1">
            CELPIP Resource
          </p>
          <h1 className="mb-4 text-[34px] font-bold leading-tight text-[#212E42] screen744:text-[46px]">
            {page.h1}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-[#525D6F] screen744:text-lg">
            {page.intro}
          </p>
        </div>

        <section className="mb-8 rounded-xl border border-[#D5D6D8] bg-white p-5">
          <p className="mb-2 text-sm font-semibold uppercase text-primary1">
            Quick Answer
          </p>
          <h2 className="mb-3 text-[22px] font-bold text-[#212E42]">
            {page.quickAnswer.question}
          </h2>
          <p className="text-[#525D6F] leading-relaxed">{page.quickAnswer.answer}</p>
        </section>

        <div className="grid gap-6">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-xl bg-white p-5">
              <h2 className="mb-3 text-[24px] font-bold text-[#212E42]">
                {section.title}
              </h2>
              <p className="text-[#525D6F] leading-relaxed">{section.body}</p>
              {section.bullets?.length ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[#525D6F]">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {page.samples?.length ? (
          <section className="mt-8">
            <h2 className="mb-4 text-[26px] font-bold text-[#212E42]">
              Sample Answers
            </h2>
            <div className="grid gap-6">
              {page.samples.map((sample) => (
                <article key={sample.title} className="rounded-xl bg-white p-5">
                  <h3 className="mb-3 text-[20px] font-bold text-[#212E42]">
                    {sample.title}
                  </h3>
                  <div className="mb-4 rounded-lg bg-[#F2F6FF] p-4">
                    <p className="mb-1 text-sm font-semibold text-[#212E42]">Prompt</p>
                    <p className="text-sm leading-relaxed text-[#525D6F]">{sample.prompt}</p>
                  </div>
                  <pre className="mb-4 whitespace-pre-wrap rounded-lg border border-[#D5D6D8] bg-white p-4 font-sans text-sm leading-relaxed text-[#37465C]">
                    {sample.answer}
                  </pre>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-[#525D6F]">
                    {sample.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-xl border border-[#D5D6D8] bg-white p-5">
          <h2 className="mb-4 text-[24px] font-bold text-[#212E42]">FAQs</h2>
          <div className="grid gap-4">
            {page.faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-semibold text-[#212E42]">{faq.question}</h3>
                <p className="mt-1 text-[#525D6F] leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={page.primaryCta.href}
            className="rounded-lg bg-primary1 px-5 py-3 text-sm font-semibold text-white"
          >
            {page.primaryCta.label}
          </Link>
          {page.secondaryCta ? (
            <Link
              href={page.secondaryCta.href}
              className="rounded-lg border border-[#D5D6D8] bg-white px-5 py-3 text-sm font-semibold text-[#212E42]"
            >
              {page.secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
