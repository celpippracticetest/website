"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { ComponentType } from "react";

const MockTest = dynamic(
  () => import("@/components/pages/referral/segment/MockTest"),
  { ssr: false }
);
const PracticeAndSubmit = dynamic(
  () => import("@/components/pages/referral/segment/PracticeAndSubmit"),
  { ssr: false }
);
const AIReviewTest = dynamic(
  () => import("@/components/pages/referral/segment/AIReviewTest"),
  { ssr: false }
);
const Improve = dynamic(
  () => import("@/components/pages/referral/segment/Improve"),
  { ssr: false }
);
const Learning = dynamic(
  () => import("@/components/pages/referral/segment/Learning"),
  { ssr: false }
);

type Badge = {
  label: string;
  className: string;
};

type ShowcaseItem = {
  title: string;
  description: string;
  titleAccentClass: string;
  badges: Badge[];
  Preview: ComponentType;
  previewMinHeight: string;
  previewRotate: string;
  previewTopMobile: string;
  textFirst: boolean;
  textPaddingTop?: string;
};

const showcaseItems: ShowcaseItem[] = [
  {
    title: "Mock Exam",
    titleAccentClass: "text-purple",
    description:
      "Timed, full-length test that simulates the real CELPIP exam with the most accurate scoring.",
    badges: [
      { label: "Mock Exam", className: "bg-purpule_light text-purple" },
      { label: "Score", className: "bg-primary6 text-primary2" },
    ],
    Preview: MockTest,
    previewMinHeight: "min-h-[557px]",
    previewRotate: "rotate-[17deg]",
    previewTopMobile: "top-[200px]",
    textFirst: true,
    textPaddingTop: "screen744:pt-[72px]",
  },
  {
    title: "Learning",
    titleAccentClass: "text-secondary2",
    description:
      "Daily AI lessons for all four skills, personalized to your CLB target so every session closes a specific gap.",
    badges: [
      { label: "Daily Lessons", className: "bg-secondary6 text-secondary2" },
      { label: "Skill Plan", className: "bg-primary6 text-primary2" },
    ],
    Preview: Learning,
    previewMinHeight: "min-h-[557px]",
    previewRotate: "-rotate-[17deg]",
    previewTopMobile: "top-[180px]",
    textFirst: false,
    textPaddingTop: "screen744:pt-[81px] screen1280:pt-[90px]",
  },
  {
    title: "Practice & Submit",
    titleAccentClass: "text-success",
    description:
      "Answer real questions and get instant results—perfect for writing improvement.",
    badges: [
      { label: "Submit Writing", className: "bg-success_light text-success" },
      { label: "AI Feedback", className: "bg-primary6 text-primary2" },
    ],
    Preview: PracticeAndSubmit,
    previewMinHeight: "min-h-[557px]",
    previewRotate: "rotate-[17deg]",
    previewTopMobile: "top-[200px]",
    textFirst: true,
    textPaddingTop: "screen744:pt-[72px]",
  },
  {
    title: "AI Review",
    titleAccentClass: "text-secondary2",
    description:
      "Receive real-time feedback on your speaking, including pronunciation, fluency, and vocabulary.",
    badges: [
      { label: "Speaking", className: "bg-secondary6 text-secondary2" },
      { label: "AI Feedback", className: "bg-primary6 text-primary2" },
    ],
    Preview: AIReviewTest,
    previewMinHeight: "min-h-[557px]",
    previewRotate: "-rotate-[17deg]",
    previewTopMobile: "top-[184px]",
    textFirst: false,
    textPaddingTop: "screen744:pt-[108px] screen1280:pt-[110px]",
  },
  {
    title: "Improve",
    titleAccentClass: "text-primary1",
    description:
      "See what to fix and how to fix it, with detailed writing analysis and grammar insights.",
    badges: [
      { label: "Speaking", className: "bg-secondary6 text-secondary2" },
      { label: "AI Feedback", className: "bg-primary6 text-primary2" },
    ],
    Preview: Improve,
    previewMinHeight: "min-h-[557px]",
    previewRotate: "rotate-[17deg]",
    previewTopMobile: "top-[200px]",
    textFirst: true,
    textPaddingTop: "screen744:pt-[72px]",
  },
];

function PreviewCard({
  badges,
  Preview,
  previewMinHeight,
  previewRotate,
  previewTopMobile,
}: Pick<
  ShowcaseItem,
  "badges" | "Preview" | "previewMinHeight" | "previewRotate" | "previewTopMobile"
>) {
  return (
    <div
      className={`absolute left-0 right-0 flex origin-center justify-center px-4 screen744:static ${previewTopMobile} ${previewRotate}`}
    >
      <div
        className={`h-[463px] w-[343px] max-w-[1160px] rounded-2xl border border-outline bg-white px-4 pt-4 shadow-sm ${previewMinHeight}`}
      >
        <div className="flex justify-between">
          <Image
            alt="Beaver mascot"
            width={48}
            height={72}
            src="/images/BeaverDrink.png"
          />
          <div className="flex items-center gap-2 screen1280:gap-4">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className={`flex h-11 items-center justify-center rounded-full px-2 py-2 screen1280:px-4 ${badge.className}`}
              >
                <span className="text-sm font-normal screen1280:text-lg">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <Preview />
        </div>
      </div>
    </div>
  );
}

function TextBlock({
  title,
  description,
  titleAccentClass,
  textPaddingTop,
}: Pick<
  ShowcaseItem,
  "title" | "description" | "titleAccentClass" | "textPaddingTop"
>) {
  return (
    <div
      className={`relative flex-1 px-6 pt-6 ${textPaddingTop ?? "screen744:pt-[72px]"}`}
    >
      <h3 className="text-xl font-bold text-text1 screen744:text-2xl">
        <span className={titleAccentClass}>{title}</span>
      </h3>
      <p className="mt-4 text-sm leading-relaxed text-text2 screen744:mt-6 screen744:text-base">
        {description}
      </p>
      <div className="mt-4 h-px bg-outline screen744:hidden" />
    </div>
  );
}

type FeatureShowcaseCardsProps = {
  className?: string;
};

export function FeatureShowcaseCards({ className }: FeatureShowcaseCardsProps) {
  return (
    <div className={`flex flex-col gap-6 ${className ?? ""}`}>
      {showcaseItems.map((item) => (
        <article
          key={item.title}
          className="relative flex h-[466px] flex-col overflow-hidden rounded-2xl border border-outline screen744:h-[300px] screen744:flex-row screen744:flex-wrap screen1280:flex-nowrap screen1280:justify-between screen1280:gap-6"
        >
          {item.textFirst ? (
            <>
              <TextBlock
                title={item.title}
                description={item.description}
                titleAccentClass={item.titleAccentClass}
                textPaddingTop={item.textPaddingTop}
              />
              <PreviewCard
                badges={item.badges}
                Preview={item.Preview}
                previewMinHeight={item.previewMinHeight}
                previewRotate={item.previewRotate}
                previewTopMobile={item.previewTopMobile}
              />
            </>
          ) : (
            <>
              <PreviewCard
                badges={item.badges}
                Preview={item.Preview}
                previewMinHeight={item.previewMinHeight}
                previewRotate={item.previewRotate}
                previewTopMobile={item.previewTopMobile}
              />
              <TextBlock
                title={item.title}
                description={item.description}
                titleAccentClass={item.titleAccentClass}
                textPaddingTop={item.textPaddingTop}
              />
            </>
          )}
        </article>
      ))}
    </div>
  );
}
