import type { SkillHubType } from "@/lib/seo/siteSchema";

/**
 * Content model for the public skill guide pages (/reading, /writing,
 * /speaking, /listening). Each skill's file lists its sections in the order
 * of the content team's document; SkillGuidePage renders them.
 */

export type GuideItem = { title?: string; text: string };

export type GuideSection =
  | {
      type: "practice";
      id: string;
      title: string;
      intro?: string;
      /** Small labels on each task card, e.g. "Prep 30s". */
      tasks: { id: string; label: string; name: string; description: string; chips?: string[] }[];
    }
  | {
      type: "table";
      id: string;
      title: string;
      intro?: string;
      columns: string[];
      rows: string[][];
    }
  | {
      type: "cards";
      id: string;
      title: string;
      intro?: string;
      items: { title: string; text: string; focus?: string }[];
    }
  | {
      type: "tips";
      id: string;
      title: string;
      intro?: string;
      items: GuideItem[];
      outro?: string;
    }
  | {
      type: "sample";
      id: string;
      title: string;
      intro?: string;
      /** A written sample response with notes on why it works. */
      sample?: { task: string; question: string; answer: string; whyItWorks: string[] };
      /** Links to fuller samples (blog templates, free practice). */
      links?: { title: string; text: string; href?: string; taskId?: string }[];
    }
  | {
      type: "scoring";
      id: string;
      title: string;
      paragraphs: string[];
      criteria?: { title: string; text: string }[];
      subsections?: { title: string; text: string }[];
    }
  | {
      type: "list";
      id: string;
      title: string;
      intro?: string;
      items: GuideItem[];
    }
  | {
      type: "checklist";
      id: string;
      title: string;
      intro?: string;
      items: string[];
      outro?: string;
    }
  | {
      type: "faq";
      id: string;
      title: string;
      intro?: string;
      items: { question: string; answer: string }[];
    };

export type SkillGuide = {
  skill: SkillHubType;
  title: string;
  intro: string;
  /** Short pill above the H1, e.g. "480 practice questions · All 8 tasks". */
  badge: string;
  hero: {
    taskLabel: string;
    prompt: string;
    stats: { label: string; value: string }[];
    visual: "wave" | "lines";
    feedbackLabel: string;
  };
  sections: GuideSection[];
};
