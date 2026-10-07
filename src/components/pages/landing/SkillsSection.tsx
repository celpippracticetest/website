import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { playOnView } from "@/hooks/usePlayOnView";
import Reveal from "./Reveal";

type Skill = {
  title: string;
  description: string;
  href: string;
  tile: string;
  aiScored?: boolean;
  icon: React.ReactNode;
};

const strokeProps = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.5,
};

// The four test skills get the large cards on mobile/tablet.
const mainSkills: Skill[] = [
  {
    title: "Listening",
    description: "6 parts with timed audio",
    href: "/listening",
    tile: "bg-[#E3EBFF] text-[#1D4ED8]",
    icon: (
      <svg viewBox="0 0 25 24" fill="none" aria-hidden="true" className="w-full h-full">
        <path {...strokeProps} d="M6.73 7.051c.474-1.068.892-2.32 1.932-2.97 4.903-3.064 9.979 1.728 9.234 6.943-.431 3.018-3.605 4.633-4.868 7.158-1.082 2.165-5.348 4.193-5.69 1.11" />
        <path {...strokeProps} d="M14.174 14.317c2.533-2.687 1.894-8.995-2.29-8.805-3.15.144-2.416 4.369-1.683 5.834" />
        <path {...strokeProps} d="M9.563 9.306c3.355-.233 4.496 3.3 2.32 5.476-.567.567-1.663-.257-2.32.072-.657.328-1.149 1.363-1.796.608" />
      </svg>
    ),
  },
  {
    title: "Reading",
    description: "4 parts in the real format",
    href: "/reading",
    tile: "bg-[#FFE2E8] text-[#B91C1C]",
    icon: (
      <svg viewBox="0 0 25 24" fill="none" aria-hidden="true" className="w-full h-full">
        <path {...strokeProps} d="M22.8 16.74V4.67c0-1.2-.98-2.09-2.17-1.99h-.06c-2.1.18-5.29 1.25-7.07 2.37l-.17.11c-.29.18-.77.18-1.06 0l-.25-.15C10.24 3.9 7.06 2.84 4.96 2.67c-1.19-.1-2.16.8-2.16 1.99v12.08c0 .96.78 1.86 1.74 1.98l.29.04c2.17.29 5.52 1.39 7.44 2.44l.04.02c.27.15.7.15.96 0 1.92-1.06 5.28-2.17 7.46-2.46l.33-.04c.96-.12 1.74-1.02 1.74-1.98M12.8 5.49v15M8.55 8.49H6.3M9.3 11.49h-3" />
      </svg>
    ),
  },
  {
    title: "Writing",
    description: "2 tasks, scored out of 12",
    href: "/writing",
    tile: "bg-[#E3F8F5] text-[#0D9488]",
    aiScored: true,
    icon: (
      <svg viewBox="0 0 25 24" fill="none" aria-hidden="true" className="w-full h-full">
        <path {...strokeProps} strokeMiterlimit={10} d="m13.26 3.6-8.21 8.69c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16" />
        <path {...strokeProps} strokeMiterlimit={10} d="M11.89 5.05a6.126 6.126 0 0 0 5.45 5.15M3 22h18" />
      </svg>
    ),
  },
  {
    title: "Speaking",
    description: "8 tasks, scored out of 12",
    href: "/speaking",
    tile: "bg-[#FFEBD6] text-[#BE123C]",
    aiScored: true,
    icon: (
      <svg viewBox="0 0 25 24" fill="none" aria-hidden="true" className="w-full h-full">
        <path {...strokeProps} d="M12.2 15.5c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4s-4 1.79-4 4v5.5c0 2.21 1.79 4 4 4" />
        <path {...strokeProps} d="M4.55 9.65v1.7c0 4.22 3.43 7.65 7.65 7.65s7.65-3.43 7.65-7.65v-1.7M10.81 6.43c.9-.33 1.88-.33 2.78 0M11.4 8.55c.53-.14 1.08-.14 1.61 0M12.2 19v3" />
      </svg>
    ),
  },
];

// Tools: shown as compact cards on mobile/tablet.
const toolSkills: Skill[] = [
  {
    title: "Mock Exams",
    description: "Full tests with real timing",
    href: "/exam-overview",
    tile: "bg-[#FAE0FF] text-[#B81CD6]",
    icon: (
      <svg viewBox="0 0 25 24" fill="none" aria-hidden="true" className="w-full h-full">
        <path {...strokeProps} strokeMiterlimit={10} d="M8.6 2v3M16.6 2v3M4.1 9.09h17M21.6 8.5V17c0 3-1.5 5-5 5h-8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5" />
        <path {...strokeProps} d="M15.933 15a3.335 3.335 0 0 1-6.666 0 3.335 3.335 0 0 1 6.666 0" />
        <path {...strokeProps} d="m13.837 16.06-1.033-.617a.74.74 0 0 1-.327-.573v-1.367" />
      </svg>
    ),
  },
  {
    title: "Learning",
    description: "Ask an AI tutor, get instant answers",
    href: "/learning",
    tile: "bg-[#FEF9C3] text-[#854D0E]",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="w-[82%] h-[82%]">
        <path {...strokeProps} strokeMiterlimit={10} d="M5.07504 11.0667H7.65004V17.0667C7.65004 18.4667 8.40838 18.75 9.33338 17.7L15.6417 10.5333C16.4167 9.65832 16.0917 8.93332 14.9167 8.93332H12.3417V2.93332C12.3417 1.53332 11.5834 1.24999 10.6584 2.29999L4.35004 9.46665C3.58338 10.35 3.90838 11.0667 5.07504 11.0667Z" />
      </svg>
    ),
  },
  {
    title: "Words",
    description: "Save words, study with flashcards",
    href: "/words",
    tile: "bg-[#CCFBF1] text-[#0D8A72]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-[92%] h-[92%]">
        <path {...strokeProps} strokeWidth={2} d="M4 6L12 6M8 6V4M12.0008 14.0003C8.11407 13.0287 6.11567 10.6408 5.54688 6.37793M4.0001 13.9998C7.88484 13.0286 9.88317 10.6426 10.4531 6.38379M14.5 17.0002H19.5M13 19.0002L16.0784 11.6891C16.4219 10.8732 17.5781 10.8732 17.9216 11.6891L21 19.0002" />
      </svg>
    ),
  },
];

const AiBadge = () => (
  <span className="absolute top-[14px] right-[12px] screen1280:!top-[16px] flex items-center h-[22px] px-[8px] rounded-full bg-[#FFEDE4] text-[#B4471F] text-[11px] font-bold">
    AI-scored
  </span>
);

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/see:translate-x-[3px] group-data-[play]/see:translate-x-[3px]">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const FullCard = ({ skill, className, index = 0 }: { skill: Skill; className?: string; index?: number }) => (
  <Link
    ref={playOnView}
    data-play-delay={index * 120}
    href={skill.href}
    className={cn(
      "group relative bg-white border border-[#E8EEFB] rounded-[16px] shadow-[0_1px_2px_rgba(33,46,66,0.04)]",
      "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
      "hover:-translate-y-[4px] data-[play]:-translate-y-[4px] hover:border-[#C9D5F5] data-[play]:border-[#C9D5F5] hover:shadow-[0_14px_28px_-16px_rgba(37,84,214,0.35)] data-[play]:shadow-[0_14px_28px_-16px_rgba(37,84,214,0.35)] active:-translate-y-[1px] active:duration-100",
      "flex flex-col gap-[10px] screen744:!gap-[12px] screen1280:!gap-[14px] h-[130px] p-[14px] screen744:!h-[156px] screen744:!p-[16px] screen1280:!h-[152px] screen1280:!px-[16px] screen1280:!py-[18px]",
      className,
    )}
  >
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[8px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-data-[play]:scale-110 group-hover:-rotate-3 group-data-[play]:-rotate-3 motion-reduce:transition-none",
        "w-[36px] h-[36px] p-[7px] screen1280:!w-[40px] screen1280:!h-[40px] screen1280:!p-[8px]",
        skill.tile,
      )}
    >
      {skill.icon}
    </span>
    {skill.aiScored && <AiBadge />}
    <span className="flex flex-col gap-[3px] screen1280:!gap-[4px]">
      <h3 className="m-0 text-[15px] leading-[20px] screen1280:!text-[16px] screen1280:!leading-[22px] font-semibold text-[#212E42] transition-colors duration-300 group-hover:text-[#2554D6] group-data-[play]:text-[#2554D6]">
        {skill.title}
      </h3>
      <span className="text-[12px] leading-[17px] screen1280:!text-[13px] screen1280:!leading-[18px] text-[#5B6B82]">
        {skill.description}
      </span>
    </span>
  </Link>
);

const CompactCard = ({ skill, index = 0 }: { skill: Skill; index?: number }) => (
  <Link
    ref={playOnView}
    data-play-delay={index * 120}
    href={skill.href}
    className={cn(
      "group relative bg-white border border-[#E8EEFB] rounded-[16px] shadow-[0_1px_2px_rgba(33,46,66,0.04)]",
      "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
      "hover:-translate-y-[4px] data-[play]:-translate-y-[4px] hover:border-[#C9D5F5] data-[play]:border-[#C9D5F5] hover:shadow-[0_14px_28px_-16px_rgba(37,84,214,0.35)] data-[play]:shadow-[0_14px_28px_-16px_rgba(37,84,214,0.35)] active:-translate-y-[1px] active:duration-100",
      "flex flex-col items-center justify-center gap-[8px] h-[88px] px-[6px] py-[12px]",
    )}
  >
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[8px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-data-[play]:scale-110 group-hover:-rotate-3 group-data-[play]:-rotate-3 motion-reduce:transition-none",
        "w-[32px] h-[32px] p-[6px]",
        skill.tile,
      )}
    >
      {skill.icon}
    </span>
    <h3 className="m-0 text-[13px] leading-[18px] font-semibold text-[#212E42] transition-colors duration-300 group-hover:text-[#2554D6] group-data-[play]:text-[#2554D6]">
      {skill.title}
    </h3>
  </Link>
);

const SkillsSection = () => {
  return (
    <section
      aria-labelledby="skills-heading"
      className="mx-auto w-full max-w-[1236px] px-[20px] pt-[40px] screen744:!px-[48px] screen744:!pt-[56px] screen1280:!px-[40px] screen1440:!px-0 screen1280:!pt-[24px] screen1280:!pb-[64px] flex flex-col gap-[14px] screen1280:!gap-[20px]"
    >
      <Reveal className="flex items-end justify-between">
        <h2
          id="skills-heading"
          className="text-balance m-0 text-[21px] leading-[28px] screen744:!text-[28px] screen744:!leading-[36px] screen1280:!text-[26px] screen1280:!leading-[34px] font-bold text-[#212E42]"
        >
          Practice every CELPIP skill
        </h2>
        <Link
          href="/practice-overview"
          ref={playOnView}
          className="group/see hidden screen1280:!flex items-center gap-[6px] h-[44px] text-[15px] font-semibold text-[#2554D6] transition-colors hover:text-[#1B3FA8] data-[play]:text-[#1B3FA8]"
        >
          See all practice
          <ArrowIcon />
        </Link>
      </Reveal>

      {/* Desktop: one row of seven cards */}
      <div className="hidden screen1280:!grid grid-cols-7 gap-[14px]">
        {[...mainSkills, ...toolSkills].map((skill, index) => (
          <Reveal key={skill.title} delay={index * 60}>
            <FullCard skill={skill} index={index} />
          </Reveal>
        ))}
      </div>

      {/* Mobile & tablet: skills, then compact tool cards */}
      <div className="grid screen1280:!hidden grid-cols-2 screen744:!grid-cols-4 gap-[10px] screen744:!gap-[12px]">
        {mainSkills.map((skill, index) => (
          <Reveal key={skill.title} delay={index * 60}>
            <FullCard skill={skill} index={index} />
          </Reveal>
        ))}
      </div>
      <div className="grid screen1280:!hidden grid-cols-3 gap-[10px]">
        {toolSkills.map((skill, index) => (
          <Reveal key={skill.title} delay={240 + index * 60}>
            <CompactCard skill={skill} index={index} />
          </Reveal>
        ))}
      </div>
      <Link
        href="/practice-overview"
        ref={playOnView}
        className="group/see flex screen1280:!hidden items-center justify-center gap-[6px] h-[44px] text-[15px] font-semibold text-[#2554D6] transition-colors hover:text-[#1B3FA8] data-[play]:text-[#1B3FA8]"
      >
        See all practice
        <ArrowIcon />
      </Link>
    </section>
  );
};

export default SkillsSection;
