import React from "react";
import dynamic from "next/dynamic";
import { SkillPageContent } from "@/data/skill-pages-content";
import Link from "next/link";
import { taskPickerPath, type SkillRoute } from "@/lib/practiceRoutes";
import Image from "next/image";
import ExamSectionCard from "../pages/landing/ExamSectionCard";
import SvgListening from "../icons/Listening";
import SvgSpeaking from "../icons/Speaking";
import SvgWriting from "../icons/Writing";
import SvgReading from "../icons/Reading";
import SvgMockExamsColorful from "../icons/MockExamsColorful";
import SvgLearning from "../icons/Learning";

const FaqAccordion = dynamic(() => import("./FaqAccordion"), {
  loading: () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-[#D5D6D8] bg-white animate-pulse"
        />
      ))}
    </div>
  ),
});

interface SkillLandingPageProps {
  content: SkillPageContent;
  skillType: "listening" | "reading" | "writing" | "speaking";
  availableTasks?: { id: string; taskNumber: string }[];
}

const SKILL_SECTION_LABEL: Record<
  SkillLandingPageProps["skillType"],
  string
> = {
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  listening: "Listening",
};

const SKILL_NAV_ITEMS = [
  {
    title: "Listening",
    icon: <SvgListening />,
    bgColor: "bg-primary5",
    link: "/listening",
  },
  {
    title: "Speaking",
    icon: <SvgSpeaking />,
    bgColor: "bg-secondary5",
    link: "/speaking",
  },
  {
    title: "Writing",
    icon: <SvgWriting />,
    bgColor: "bg-success5",
    link: "/writing",
  },
  {
    title: "Reading",
    icon: <SvgReading />,
    bgColor: "bg-error5",
    link: "/reading",
  },
  {
    title: "Mock Exams",
    icon: <SvgMockExamsColorful />,
    bgColor: "bg-purple5",
    link: "/exam-overview",
  },
  {
    title: "Learning",
    icon: <SvgLearning />,
    bgColor: "bg-[#FEF9C3]",
    link: "/learning",
  },
];

const RESOURCE_LINKS: Record<
  SkillLandingPageProps["skillType"],
  { label: string; href: string; description: string }[]
> = {
  listening: [
    {
      label: "Free CELPIP Practice Test",
      href: "/free-celpip-practice-test",
      description: "Start with a full four-skill practice path.",
    },
    {
      label: "CELPIP Listening Score Guide",
      href: "/wiki/celpip-listening-score-guide",
      description: "Understand how listening performance maps to score levels.",
    },
  ],
  reading: [
    {
      label: "Free CELPIP Practice Test",
      href: "/free-celpip-practice-test",
      description: "Start with a full four-skill practice path.",
    },
    {
      label: "CELPIP Reading Score Guide",
      href: "/wiki/celpip-reading-score-guide",
      description: "Review reading score expectations and task strategy.",
    },
  ],
  writing: [
    {
      label: "CELPIP Writing Task 1 Samples",
      href: "/celpip-writing-task-1-samples",
      description: "Study email prompts, model answers, and tone guidance.",
    },
    {
      label: "CELPIP Writing Task 2 Samples",
      href: "/celpip-writing-task-2-samples",
      description: "Review survey response structure and sample answers.",
    },
  ],
  speaking: [
    {
      label: "CELPIP Speaking Samples",
      href: "/celpip-speaking-samples",
      description: "Practice sample answers and response structure.",
    },
    {
      label: "Complete CELPIP Speaking Guide",
      href: "/wiki/complete-celpip-speaking-guide",
      description: "Review task-by-task speaking strategy.",
    },
  ],
};

const SkillLandingPage: React.FC<SkillLandingPageProps> = ({
  content,
  skillType,
  availableTasks = [],
}) => {
  const navItems = SKILL_NAV_ITEMS.filter(
    (item) => item.link !== `/${skillType}`
  );

  return (
    <div className="w-full bg-[#F2F6FF] min-h-screen pb-[120px]">
      {/* Hero Section */}
      <div className="max-w-[1200px] mx-auto px-4 pt-8">
        <h1 className="text-[32px] font-bold text-[#212E42] mb-4">
          {content.title}
        </h1>

        <p className="max-w-3xl text-base leading-relaxed text-text2 screen744:text-lg mb-8">
          {content.answerFirstIntro}
        </p>

        {content.aiAnswer ? (
          <section className="mb-8 rounded-xl border border-[#D5D6D8] bg-white p-5">
            <p className="mb-2 text-sm font-semibold uppercase text-primary1">
              Quick Answer
            </p>
            <h2 className="mb-3 text-[22px] font-bold text-[#212E42]">
              {content.aiAnswer.question}
            </h2>
            <p className="max-w-4xl text-[#525D6F] leading-relaxed">
              {content.aiAnswer.answer}
            </p>
          </section>
        ) : null}

        {/* Tasks Grid — flex wrap replaces CSS grid */}
        <div className="flex flex-wrap gap-4 mb-16">
          {content.tasks.map((task) => {
            const realTask = availableTasks.find((t) => {
              const num = t.taskNumber.replace(/\D/g, "");
              return num === task.id;
            });

            const href = taskPickerPath(
              skillType as SkillRoute,
              realTask ? realTask.id : task.id
            );

            return (
              <Link
                key={task.id}
                id={`task-${task.id}`}
                href={href}
                className="bg-[#FFF9F0] border border-[#FFEBD6] rounded-xl p-6 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
              >
                <span className="text-[#76808F] text-sm font-medium">
                  {task.title}
                </span>
                <span className="text-[#212E42] text-lg font-semibold">
                  {task.description}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Content Section with Mascot */}
        <div className="flex flex-col lg:flex-row gap-12 items-start mb-16">
          <div className="flex-1">
            <h2 className="text-[24px] font-bold text-[#212E42] mb-4">
              Start Your CELPIP {SKILL_SECTION_LABEL[skillType]} Practice
            </h2>
            <p
              className="text-[#525D6F] mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content.description }}
            />

            <h3 className="text-[18px] font-bold text-[#212E42] mb-3">
              {content.tipsTitle}
            </h3>
            <p className="text-[#525D6F] mb-4">
              It&apos;s not just about sitting down for the tests; it&apos;s
              also how you practice. Here are some tips on how to improve your
              score:
            </p>
            <ul className="list-disc pl-5 text-[#525D6F] mb-8 space-y-2">
              {content.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>

            <h3 className="text-[18px] font-bold text-[#212E42] mb-3">
              {content.format.title}
            </h3>
            <p className="text-[#525D6F] mb-4">{content.format.description}</p>
            <ul className="list-disc pl-5 text-[#525D6F] space-y-2">
              {content.format.points.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>

            {content.scoreFocus ? (
              <section className="mt-8">
                <h3 className="text-[18px] font-bold text-[#212E42] mb-4">
                  {content.scoreFocus.title}
                </h3>
                <div className="grid gap-3 screen744:grid-cols-3">
                  {content.scoreFocus.items.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#D5D6D8] bg-white p-4"
                    >
                      <h4 className="mb-2 text-sm font-bold text-[#212E42]">
                        {item.label}
                      </h4>
                      <p className="text-sm leading-relaxed text-[#525D6F]">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {content.commonMistakes?.length ? (
              <section className="mt-8">
                <h3 className="text-[18px] font-bold text-[#212E42] mb-3">
                  Common Mistakes to Avoid
                </h3>
                <ul className="list-disc pl-5 text-[#525D6F] space-y-2">
                  {content.commonMistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Mascot Image — explicit dimensions prevent CLS, priority for LCP */}
          <div className="hidden lg:block w-[300px] h-[300px] shrink-0">
            <Image
              src="/images/BeaverPractice.png"
              alt="Beavo mascot encouraging CELPIP practice"
              width={300}
              height={300}
              className="object-contain w-full h-full"
              priority
            />
          </div>
        </div>

        <section className="mb-16">
          <h2 className="text-[24px] font-bold text-[#212E42] mb-4">
            Related CELPIP Resources
          </h2>
          <div className="grid gap-4 screen744:grid-cols-2">
            {RESOURCE_LINKS[skillType].map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className="rounded-xl border border-[#D5D6D8] bg-white p-5 transition-shadow hover:shadow-md"
              >
                <span className="mb-2 block text-lg font-semibold text-[#212E42]">
                  {resource.label}
                </span>
                <span className="text-sm leading-relaxed text-[#525D6F]">
                  {resource.description}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <div className="mb-16">
          <h2 className="text-[24px] font-bold text-[#212E42] mb-6">FAQs</h2>
          <FaqAccordion faqs={content.faqs} />
        </div>

        {/* Bottom Navigation Cards */}
        <div className="flex flex-wrap screen1280:flex-nowrap gap-[16px] screen1280:gap-[24px] w-full max-w-[1440px] mx-auto justify-center z-0 relative">
          {navItems.map((exam, index, array) => (
            <ExamSectionCard
              key={index}
              title={exam.title}
              icon={exam.icon}
              bgColor={exam.bgColor}
              isLast={index === array.length - 1}
              link={exam.link}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillLandingPage;
