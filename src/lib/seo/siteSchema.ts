import type { SkillPageContent } from "@/data/skill-pages-content";
import { EXAM_OVERVIEW_FAQS } from "@/data/exam-overview-faqs";
import { HOMEPAGE_TESTIMONIALS } from "@/data/homepage-testimonials";
import type { TExamSchemaDto } from "@/models/exam.model";
import { publicSiteOrigin } from "@/lib/seo/publicSite";
import {
  skillLandingTaskHref,
  type SkillLandingAvailableTask,
} from "@/lib/skillLandingTasks";

export const SITE_NAME = "CELPIP Practice Test";
export const SITE_LEGAL_NAME = "CELPIPPRACTICETEST.com";
export const SITE_SUPPORT_EMAIL = "support@celpippracticetest.com";

export const SITE_SOCIAL_PROFILES = [
  "https://www.linkedin.com/company/celpippracticetest",
  "https://www.youtube.com/@celpippracticetestcom",
  "https://www.instagram.com/celpippracticetest/",
] as const;

export const HOMEPAGE_PRACTICE_SECTIONS = [
  {
    schemaName: "CELPIP Listening Practice",
    path: "/listening",
  },
  {
    schemaName: "CELPIP Speaking Practice",
    path: "/speaking",
  },
  {
    schemaName: "CELPIP Writing Practice",
    path: "/writing",
  },
  {
    schemaName: "CELPIP Reading Practice",
    path: "/reading",
  },
  {
    schemaName: "CELPIP Mock Exams",
    path: "/exam-overview",
  },
  {
    schemaName: "CELPIP Learning",
    path: "/learning",
  },
  {
    schemaName: "CELPIP Vocabulary Tracker",
    path: "/words",
  },
] as const;

export type SkillHubType = "listening" | "reading" | "writing" | "speaking";

const SKILL_HUB_SCHEMA: Record<
  SkillHubType,
  {
    name: string;
    description: string;
    about: string;
    breadcrumbName: string;
    teaches: string[];
    assesses: string[];
  }
> = {
  speaking: {
    name: "CELPIP Speaking Practice",
    description:
      "CELPIP speaking practice covering all eight speaking task types, with test-format guidance, score-improvement tips, and practice material.",
    about: "CELPIP Speaking",
    breadcrumbName: "Speaking Practice",
    teaches: [
      "English speaking fluency",
      "Pronunciation",
      "Vocabulary",
      "Organizing spoken responses",
      "Responding to everyday speaking scenarios",
    ],
    assesses: [
      "English speaking ability",
      "Fluency",
      "Pronunciation",
      "Vocabulary",
      "Response organization",
    ],
  },
  writing: {
    name: "CELPIP Writing Practice",
    description:
      "CELPIP writing practice covering Writing an Email and Survey Questions, with test-format guidance, timing advice, score-improvement tips, and practice exercises.",
    about: "CELPIP Writing",
    breadcrumbName: "Writing Practice",
    teaches: [
      "English writing",
      "Email writing",
      "Responding to survey questions",
      "Organizing written responses",
      "Grammar and punctuation",
      "Writing under timed conditions",
    ],
    assesses: [
      "Written English communication",
      "Response organization",
      "Grammar",
      "Spelling",
      "Vocabulary",
    ],
  },
  reading: {
    name: "CELPIP Reading Practice",
    description:
      "CELPIP reading practice covering Correspondence, Apply a Diagram, Information, and Viewpoints, with test-format guidance, reading strategies, and practice exercises.",
    about: "CELPIP Reading",
    breadcrumbName: "Reading Practice",
    teaches: [
      "English reading comprehension",
      "Skimming",
      "Scanning",
      "Understanding correspondence",
      "Interpreting diagrams",
      "Extracting information from texts",
      "Understanding viewpoints",
      "Vocabulary development",
    ],
    assesses: [
      "English reading comprehension",
      "Information retrieval",
      "Understanding written correspondence",
      "Interpreting written information",
      "Understanding arguments and viewpoints",
    ],
  },
  listening: {
    name: "CELPIP Listening Practice",
    description:
      "CELPIP listening practice covering six listening task types, with test-format guidance, listening strategies, and practice exercises.",
    about: "CELPIP Listening",
    breadcrumbName: "Listening Practice",
    teaches: [
      "English listening comprehension",
      "Listening for key details",
      "Note-taking while listening",
      "Understanding paraphrased information",
      "Identifying speaker intent",
      "Recognizing transitions and distractors",
      "Listening under timed conditions",
    ],
    assesses: [
      "English listening comprehension",
      "Understanding everyday conversations",
      "Understanding spoken information",
      "Understanding news items",
      "Understanding discussions",
      "Understanding viewpoints",
    ],
  },
};

export function buildOrganizationJsonLd(baseUrlRaw?: string) {
  const baseUrl = publicSiteOrigin(baseUrlRaw);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE_LEGAL_NAME,
    alternateName: SITE_NAME,
    url: `${baseUrl}/`,
    description:
      "Independent third-party platform providing digital CELPIP practice tests, skill-based exercises, mock exams, and AI-assisted feedback for English language exam preparation.",
    email: SITE_SUPPORT_EMAIL,
    logo: `${baseUrl}/images/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE_SUPPORT_EMAIL,
      url: `${baseUrl}/contact-us`,
      availableLanguage: "English",
    },
    sameAs: [...SITE_SOCIAL_PROFILES],
  };
}

export function buildWebSiteJsonLd(baseUrlRaw?: string) {
  const baseUrl = publicSiteOrigin(baseUrlRaw);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: `${baseUrl}/`,
    name: SITE_LEGAL_NAME,
    alternateName: SITE_NAME,
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
    inLanguage: "en",
  };
}

export function buildRootLayoutJsonLd(baseUrlRaw?: string) {
  return [buildOrganizationJsonLd(baseUrlRaw), buildWebSiteJsonLd(baseUrlRaw)];
}

export function buildHomepageProductJsonLd(baseUrlRaw?: string) {
  const baseUrl = publicSiteOrigin(baseUrlRaw);
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

export function buildHomepageWebPageJsonLd(baseUrlRaw?: string) {
  const baseUrl = publicSiteOrigin(baseUrlRaw);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${baseUrl}/#webpage`,
    url: `${baseUrl}/`,
    name: "CELPIP Practice Test Online",
    description:
      "Online CELPIP preparation platform offering mock exams, skill-based practice, study guides, and AI-powered scoring and feedback.",
    isPartOf: {
      "@id": `${baseUrl}/#website`,
    },
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
    about: {
      "@type": "Thing",
      name: "CELPIP test preparation",
    },
    mainEntity: {
      "@id": `${baseUrl}/#practice-sections`,
    },
    inLanguage: "en",
  };
}

export function buildHomepageItemListJsonLd(baseUrlRaw?: string) {
  const baseUrl = publicSiteOrigin(baseUrlRaw);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${baseUrl}/#practice-sections`,
    name: "CELPIP Practice and Learning Sections",
    numberOfItems: HOMEPAGE_PRACTICE_SECTIONS.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: HOMEPAGE_PRACTICE_SECTIONS.map((section, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LearningResource",
        name: section.schemaName,
        url: `${baseUrl}${section.path}`,
      },
    })),
  };
}

export function buildSkillHubJsonLdBlocks({
  skillType,
  content,
  availableTasks,
  baseUrlRaw,
}: {
  skillType: SkillHubType;
  content: SkillPageContent;
  availableTasks: SkillLandingAvailableTask[];
  baseUrlRaw?: string;
}) {
  const baseUrl = publicSiteOrigin(baseUrlRaw);
  const copy = SKILL_HUB_SCHEMA[skillType];
  const pageUrl = `${baseUrl}/${skillType}`;
  const itemList = content.tasks.map((task, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: `Task ${task.id}: ${task.description}`,
    url: `${baseUrl}${skillLandingTaskHref(skillType, task.id, availableTasks)}`,
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: copy.name,
      description: copy.description,
      isPartOf: {
        "@id": `${baseUrl}/#website`,
      },
      publisher: {
        "@id": `${baseUrl}/#organization`,
      },
      about: {
        "@type": "Thing",
        name: copy.about,
      },
      mainEntity: {
        "@id": `${pageUrl}#learning-resource`,
      },
      breadcrumb: {
        "@id": `${pageUrl}#breadcrumb`,
      },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "@id": `${pageUrl}#learning-resource`,
      url: pageUrl,
      name: copy.name,
      description: copy.description,
      learningResourceType: ["Practice Test", "Exam Preparation"],
      educationalUse: ["Practice", "Exam Preparation"],
      teaches: copy.teaches,
      assesses: copy.assesses,
      audience: {
        "@type": "EducationalAudience",
        audienceType: "CELPIP test candidates",
      },
      provider: {
        "@id": `${baseUrl}/#organization`,
      },
      hasPart: {
        "@id": `${pageUrl}#task-list`,
      },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${pageUrl}#task-list`,
      name: `${copy.name} Tasks`,
      numberOfItems: itemList.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: itemList,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${baseUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: copy.breadcrumbName,
          item: pageUrl,
        },
      ],
    },
  ];
}

export function buildExamOverviewStructuredData(
  exams: TExamSchemaDto[],
  baseUrlRaw?: string,
) {
  const baseUrl = publicSiteOrigin(baseUrlRaw);
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
