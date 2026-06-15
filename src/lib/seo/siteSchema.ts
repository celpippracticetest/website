import type { SkillPageContent } from "@/data/skill-pages-content";
import type { TExamSchemaDto } from "@/models/exam.model";
import { FAQ_DATA } from "@/components/dashboard-app/ExamFAQ";

export const SITE_NAME = "CELPIP Practice Test";

export const SITE_SOCIAL_PROFILES = [
  "https://www.linkedin.com/company/celpippracticetest",
  "https://www.youtube.com/@celpippracticetestcom",
  "https://www.instagram.com/celpippracticetest/",
] as const;

const DEFAULT_APP_BASE_URL = "https://celpippracticetest.com";

function normalizeBaseUrl(raw: string | undefined): string {
  const input = (raw ?? DEFAULT_APP_BASE_URL).trim().replace(/^['"]|['"]$/g, "");
  if (!input) return DEFAULT_APP_BASE_URL;

  try {
    return new URL(input).toString().replace(/\/$/, "");
  } catch {
    if (/^https?:\/\//i.test(input)) return DEFAULT_APP_BASE_URL;
    const hostPart = input.split("/")[0];
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostPart)) {
      return `http://${input}`.replace(/\/$/, "");
    }
    return `https://${input}`.replace(/\/$/, "");
  }
}

export function buildRootLayoutJsonLd(baseUrlRaw?: string) {
  const baseUrl = normalizeBaseUrl(baseUrlRaw);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: SITE_NAME,
        url: baseUrl,
        logo: `${baseUrl}/images/logo.png`,
        description:
          "CELPIP preparation platform with AI-powered scoring and mock exams.",
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "support@celpippracticetest.com",
            availableLanguage: ["English"],
          },
        ],
        knowsAbout: [
          "CELPIP practice tests",
          "CELPIP Listening",
          "CELPIP Reading",
          "CELPIP Writing",
          "CELPIP Speaking",
          "Canadian Language Benchmark scores",
          "Canadian immigration language preparation",
        ],
        sameAs: [...SITE_SOCIAL_PROFILES],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        name: SITE_NAME,
        url: baseUrl,
        publisher: { "@id": `${baseUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${baseUrl}/wiki?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function buildHomepageProductJsonLd(baseUrlRaw?: string) {
  const baseUrl = normalizeBaseUrl(baseUrlRaw);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${baseUrl}/#celpip-practice-service`,
    name: "CELPIP Practice Test Platform",
    url: baseUrl,
    description:
      "CELPIP practice tests with AI scoring for Listening, Reading, Writing, and Speaking.",
    provider: {
      "@id": `${baseUrl}/#organization`,
    },
    serviceType: "Online CELPIP exam preparation",
    areaServed: {
      "@type": "Country",
      name: "Canada",
    },
  };
}

export function buildSkillPageStructuredData({
  pageUrl,
  pageTitle,
  pageDescription,
  faqs,
}: {
  pageUrl: string;
  pageTitle: string;
  pageDescription: string;
  faqs: SkillPageContent["faqs"];
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: pageTitle,
        description: pageDescription,
        url: pageUrl,
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

export function buildExamOverviewStructuredData(
  exams: TExamSchemaDto[],
  baseUrlRaw?: string,
) {
  const baseUrl = normalizeBaseUrl(baseUrlRaw);
  const examOverviewUrl = `${baseUrl}/exam-overview`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: FAQ_DATA.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        name: "CELPIP Mock Exams",
        description:
          "Full-length CELPIP practice tests covering Listening, Reading, Writing, and Speaking.",
        url: examOverviewUrl,
        numberOfItems: exams.length,
        itemListElement: exams.map((exam, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Course",
            name: exam.name,
            description:
              "Full-length CELPIP mock exam with Listening, Reading, Writing, and Speaking sections.",
            url: `${baseUrl}/exams/exam_${exam.id}/part1`,
            provider: {
              "@type": "Organization",
              name: SITE_NAME,
              url: baseUrl,
            },
          },
        })),
      },
    ],
  };
}
