import type { SkillPageContent } from "@/data/skill-pages-content";
import { EXAM_OVERVIEW_FAQS } from "@/data/exam-overview-faqs";
import { HOMEPAGE_TESTIMONIALS } from "@/data/homepage-testimonials";
import type { TExamSchemaDto } from "@/models/exam.model";

export const SITE_NAME = "CELPIP Guide";

export const SITE_SOCIAL_PROFILES = [
  "https://www.linkedin.com/company/celpippracticetest",
  "https://www.youtube.com/@celpippracticetestcom",
  "https://www.instagram.com/celpippracticetest/",
] as const;

const DEFAULT_APP_BASE_URL = "https://celpipguide.ca";

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
            email: "support@celpipguide.ca",
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
  const reviewCount = HOMEPAGE_TESTIMONIALS.length;

  // Google requires aggregateRating when multiple Review objects are present.
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${baseUrl}/#celpip-practice-app`,
    name: "CELPIP Practice Test Platform",
    url: baseUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "CELPIP practice tests with AI scoring for Listening, Reading, Writing, and Speaking.",
    provider: {
      "@id": `${baseUrl}/#organization`,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      bestRating: "5",
      worstRating: "1",
      reviewCount: String(reviewCount),
    },
    review: HOMEPAGE_TESTIMONIALS.map((testimonial) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: testimonial.name,
      },
      reviewBody: testimonial.comment,
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
        worstRating: "1",
      },
    })),
  };
}

export function buildSkillPageStructuredData({
  pageUrl,
  pageTitle,
  pageDescription,
  aiAnswer,
  tasks,
  faqs,
}: {
  pageUrl: string;
  pageTitle: string;
  pageDescription: string;
  aiAnswer?: SkillPageContent["aiAnswer"];
  tasks?: SkillPageContent["tasks"];
  faqs: SkillPageContent["faqs"];
}) {
  const faqItems = [
    ...(aiAnswer ? [aiAnswer] : []),
    ...faqs,
  ];

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
      ...(tasks?.length
        ? [
            {
              "@type": "ItemList",
              name: `${pageTitle} task list`,
              itemListElement: tasks.map((task, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: task.description,
                url: `${pageUrl}#task-${task.id}`,
              })),
            },
          ]
        : []),
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((faq) => ({
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
  const examOverviewUrl = `${baseUrl}/exam`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: EXAM_OVERVIEW_FAQS.map((faq) => ({
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
            "@type": "LearningResource",
            name: exam.name,
            description:
              "Full-length CELPIP mock exam with Listening, Reading, Writing, and Speaking sections.",
            url: `${baseUrl}/exams/exam_${exam.id}/part1`,
            learningResourceType: "Practice test",
            educationalUse: "Practice",
            assesses: [
              "CELPIP Listening",
              "CELPIP Reading",
              "CELPIP Writing",
              "CELPIP Speaking",
            ],
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
