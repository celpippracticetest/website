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
        <h1 className="text-[32px] font-bold text-[#212E42] mb-8">
          {content.title}
        </h1>

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
