import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackCTAClick } from "@/lib/analytics";
import { playOnView } from "@/hooks/usePlayOnView";

const tabs = [
  { id: "score", label: "Your Score", shortLabel: "Your Score" },
  { id: "mistakes", label: "Your Mistakes", shortLabel: "Your Mistakes" },
  { id: "format", label: "Real Exam Format", shortLabel: "Exam Format" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const criteria = [
  { label: "Content / Coherence", score: 7 },
  { label: "Vocabulary", score: 9 },
  { label: "Readability", score: 10 },
  { label: "Task Fulfillment", score: 6 },
];

// Scores of 9+ read as strong (green), lower ones as "keep improving" (orange).
const ScoreRing = ({ score, size }: { score: number; size: "lg" | "md" }) => {
  const strong = score >= 9;
  const percent = (score / 12) * 100;
  const color = strong ? "#0F9F7F" : "#E0703F";
  return (
    <div
      role="img"
      aria-label={`${score} out of 12`}
      style={{ background: `conic-gradient(${color} 0 ${percent}%, #E9EDF3 ${percent}% 100%)` }}
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center",
        size === "lg"
          ? "w-[56px] h-[56px] screen1280:!w-[60px] screen1280:!h-[60px]"
          : "w-[48px] h-[48px] screen1280:!w-[56px] screen1280:!h-[56px]",
      )}
    >
      <div
        className={cn(
          "rounded-full bg-white flex flex-col items-center justify-center leading-none",
          size === "lg"
            ? "w-[46px] h-[46px] screen1280:!w-[50px] screen1280:!h-[50px]"
            : "w-[40px] h-[40px] screen1280:!w-[46px] screen1280:!h-[46px]",
        )}
      >
        <span
          className={cn(
            "font-extrabold",
            strong ? "text-[#0B7D64]" : "text-[#C2521F]",
            size === "lg" ? "text-[17px] screen1280:!text-[18px]" : "text-[15px] screen1280:!text-[16px]",
          )}
        >
          {score}
        </span>
        <span className={cn("font-semibold text-[#5B6B82]", size === "lg" ? "text-[10px] screen1280:!text-[11px]" : "text-[9px] screen1280:!text-[10px]")}>
          /12
        </span>
      </div>
    </div>
  );
};

const Chip = ({ children, tone }: { children: React.ReactNode; tone: "purple" | "blue" | "green" | "orange" }) => (
  <span
    className={cn(
      "flex items-center h-[28px] px-[10px] screen1280:!h-[32px] screen1280:!px-[14px] rounded-full text-[12px] screen1280:!text-[14px] font-medium whitespace-nowrap",
      tone === "purple" && "bg-[#FCEEFF] text-[#A21CAF]",
      tone === "blue" && "bg-[#EEF3FF] text-[#2554D6]",
      tone === "green" && "bg-[#E3F8F5] text-[#0B7D64]",
      tone === "orange" && "bg-[#FFEDE4] text-[#B4471F]",
    )}
  >
    {children}
  </span>
);

const ScorePanel = () => (
  <div className="mt-[14px] screen1280:!mt-[20px] border border-[#E3E8F2] rounded-[14px] flex flex-col overflow-hidden">
    <div className="flex items-center gap-[12px] screen1280:!gap-[18px] p-[14px] screen1280:!px-[20px] screen1280:!py-0 screen1280:!h-[96px] border-b border-[#E3E8F2]">
      <ScoreRing score={8} size="lg" />
      <div className="flex flex-col gap-[4px] screen1280:!grow">
        <div className="text-[16px] screen1280:!text-[18px] screen1280:!leading-[24px] font-bold text-[#212E42]">
          Excellent and clear
        </div>
        <div className="hidden screen1280:!block text-[14px] leading-[20px] text-[#5B6B82]">
          The response addresses all requirements with clear organization, varied vocabulary and proper language use.
        </div>
        <span className="screen1280:!hidden self-start flex items-center h-[24px] px-[10px] rounded-full bg-[#EEF3FF] text-[#2554D6] text-[12px] font-bold">
          About CLB 8
        </span>
      </div>
      <span className="hidden screen1280:!flex shrink-0 items-center h-[32px] px-[14px] rounded-full bg-[#EEF3FF] text-[#2554D6] text-[14px] font-bold">
        About CLB 8
      </span>
    </div>
    <div className="grid grid-cols-2 screen744:!grid-cols-4">
      {criteria.map((item, index) => (
        <div
          key={item.label}
          style={{ animationDelay: `${index * 70}ms` }}
          className={cn(
            "flex flex-col items-center justify-center gap-[8px] screen1280:!gap-[10px] h-[104px] screen1280:!h-[124px] border-[#E3E8F2]",
            "animate-in fade-in zoom-in-95 duration-500 fill-mode-both motion-reduce:animate-none",
            index % 2 === 0 && "border-r",
            index < 2 && "border-b screen744:!border-b-0",
            index === 1 && "screen744:!border-r",
          )}
        >
          <ScoreRing score={item.score} size="md" />
          <div className="text-[12px] screen1280:!text-[14px] font-medium text-[#37465C] text-center px-[4px]">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MistakesPanel = () => (
  <div className="mt-[14px] screen1280:!mt-[20px] border border-[#E3E8F2] rounded-[14px] p-[16px] screen1280:!p-[22px]">
    <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[6px] mb-[12px] text-[12px] screen1280:!text-[13px] font-medium text-[#5B6B82]">
      <span className="flex items-center gap-[6px]">
        <span className="w-[10px] h-[10px] rounded-full bg-[#FDE2E1]" /> Your mistake
      </span>
      <span className="flex items-center gap-[6px]">
        <span className="w-[10px] h-[10px] rounded-full bg-[#D7F5EC]" /> Suggested fix
      </span>
    </div>
    <p className="m-0 text-[14px] leading-[26px] screen1280:!text-[16px] screen1280:!leading-[30px] text-[#37465C]">
      If <del className="px-[3px] rounded bg-[#FDE2E1] text-[#B42318]">i</del>{" "}
      <ins className="no-underline px-[3px] rounded bg-[#D7F5EC] text-[#0B7D64]">I</ins> had to choose one,
      I <del className="px-[3px] rounded bg-[#FDE2E1] text-[#B42318]">go</del>{" "}
      <ins className="no-underline px-[3px] rounded bg-[#D7F5EC] text-[#0B7D64]">would go</ins> with Option A
      because tax <del className="px-[3px] rounded bg-[#FDE2E1] text-[#B42318]">incentive</del>{" "}
      <ins className="no-underline px-[3px] rounded bg-[#D7F5EC] text-[#0B7D64]">incentives</ins> and grants{" "}
      <del className="px-[3px] rounded bg-[#FDE2E1] text-[#B42318]">helps</del>{" "}
      <ins className="no-underline px-[3px] rounded bg-[#D7F5EC] text-[#0B7D64]">help</ins> businesses save money
      and grow. This extra money can <del className="px-[3px] rounded bg-[#FDE2E1] text-[#B42318]">lets</del>{" "}
      <ins className="no-underline px-[3px] rounded bg-[#D7F5EC] text-[#0B7D64]">let</ins> owners buy new
      equipment or hire more staff. It is a simple way to help them{" "}
      <del className="px-[3px] rounded bg-[#FDE2E1] text-[#B42318]">success</del>{" "}
      <ins className="no-underline px-[3px] rounded bg-[#D7F5EC] text-[#0B7D64]">succeed</ins> and create more
      jobs in our town.
    </p>
    <div className="mt-[14px] flex items-start gap-[10px] rounded-[12px] bg-[#F4F7FF] p-[12px] text-[13px] leading-[20px] screen1280:!text-[14px] text-[#37465C]">
      <span className="mt-[1px] text-[#2554D6]" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z" />
        </svg>
      </span>
      <span>
        <b className="font-semibold text-[#212E42]">Tip:</b> Subject–verb agreement and conditionals were your most common
        errors. Fixing them can lift your Readability score.
      </span>
    </div>
  </div>
);

const FormatPanel = () => (
  <div className="mt-[14px] screen1280:!mt-[20px] border border-[#E3E8F2] rounded-[14px] overflow-hidden">
    <div className="flex items-center justify-between gap-[12px] px-[14px] py-[10px] screen1280:!px-[20px] border-b border-[#E3E8F2] bg-[#F8FAFC]">
      <span className="text-[13px] screen1280:!text-[14px] font-semibold text-[#212E42]">
        Task 2: Responding to Survey Questions
      </span>
      <span className="flex items-center gap-[6px] shrink-0 text-[13px] screen1280:!text-[14px] font-semibold text-[#C2521F]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2M9 2h6" />
        </svg>
        24:10
      </span>
    </div>
    <div className="grid screen744:!grid-cols-[1.4fr_1fr]">
      <div className="p-[14px] screen1280:!p-[20px] flex flex-col gap-[12px] screen744:!border-r border-[#E3E8F2]">
        <p className="m-0 text-[13px] leading-[21px] screen1280:!text-[15px] screen1280:!leading-[24px] text-[#37465C]">
          Your local business council wants to help small businesses grow. Which option would you choose, and why?
        </p>
        <div className="flex flex-col gap-[8px]">
          {[
            "A: Provide grants and tax credits to small business owners.",
            "B: Create pop-up events and neighbourhood markets for local businesses.",
          ].map((option, index) => (
            <div
              key={option}
              className={cn(
                "flex items-start gap-[10px] rounded-[10px] border px-[12px] py-[10px] text-[13px] leading-[19px] screen1280:!text-[14px] text-[#212E42]",
                index === 0 ? "border-[#2554D6] bg-[#F4F7FF]" : "border-[#E3E8F2]",
              )}
            >
              <span
                className={cn(
                  "mt-[2px] w-[14px] h-[14px] shrink-0 rounded-full border-2",
                  index === 0 ? "border-[#2554D6] bg-[radial-gradient(#2554D6_40%,transparent_45%)]" : "border-[#C9D5F5]",
                )}
              />
              {option}
            </div>
          ))}
        </div>
      </div>
      <div className="p-[14px] screen1280:!p-[20px] bg-[#F8FAFC] border-t screen744:!border-t-0 border-[#E3E8F2]">
        <div className="text-[13px] screen1280:!text-[14px] font-semibold text-[#212E42]">Your submissions</div>
        <div className="mt-[10px] flex flex-col gap-[8px]">
          {[
            { when: "1 minute ago", score: 9 },
            { when: "8 minutes ago", score: 7 },
          ].map((item) => (
            <div key={item.when} className="flex items-center justify-between h-[48px] px-[12px] rounded-[10px] bg-white border border-[#E3E8F2] text-[13px] text-[#37465C]">
              {item.when}
              <span
                className={cn(
                  "flex items-center h-[24px] px-[10px] rounded-full text-[12px] font-bold",
                  item.score >= 9 ? "bg-[#E3F8F5] text-[#0B7D64]" : "bg-[#FFEDE4] text-[#C2521F]",
                )}
              >
                {item.score}/12
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const panelCopy: Record<TabId, { title: string; subtitle: string; chips: [React.ReactNode, React.ReactNode] }> = {
  score: {
    title: "CELPIP Score Result",
    subtitle:
      "Get feedback and estimated CELPIP scores for your Writing and Speaking practice in real time, based on the official assessment criteria.",
    chips: [<Chip key="a" tone="purple">Writing Task 1</Chip>, <Chip key="b" tone="blue"><span className="screen1280:!hidden">Sample</span><span className="hidden screen1280:!inline">Sample result</span></Chip>],
  },
  mistakes: {
    title: "Answer Insight",
    subtitle: "We review your response, point out every mistake, and show you a better way to say it.",
    chips: [<Chip key="a" tone="green">Writing Task 2</Chip>, <Chip key="b" tone="blue">AI feedback</Chip>],
  },
  format: {
    title: "Train Like It's the Real CELPIP",
    subtitle: "Practise with real exam-style questions, the same task types and the same timing as test day.",
    chips: [<Chip key="a" tone="orange">Writing Task 2</Chip>, <Chip key="b" tone="blue">Timed</Chip>],
  },
};

const UserResponseReview = () => {
  const [active, setActive] = useState<TabId>("score");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = tabs.findIndex((tab) => tab.id === active);
  const copy = panelCopy[active];

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      aria-labelledby="insights-heading"
      className="mx-auto w-full max-w-[1006px] px-[20px] pt-[44px] screen744:!px-[48px] screen744:!pt-[64px] screen1280:!px-0 screen1280:!pt-[16px] flex flex-col"
    >
      <h2
        id="insights-heading"
        className="m-0 text-center text-[24px] leading-[31px] screen744:!text-[30px] screen744:!leading-[38px] screen1280:!text-[32px] screen1280:!leading-[40px] font-semibold text-[#212E42]"
      >
        Get Real-Time Insights on Your Responses
      </h2>
      <p className="mx-auto mt-[8px] screen1280:!mt-[10px] mb-0 max-w-[720px] text-center text-[15px] leading-[23px] screen1280:!text-[17px] screen1280:!leading-[26px] text-[#37465C]">
        Every Writing and Speaking answer is scored on the official CELPIP criteria, with clear corrections
        <span className="hidden screen1280:!inline"> you can learn from</span>.
      </p>

      {/* Tabs with a sliding indicator */}
      <div
        role="tablist"
        aria-label="How AI feedback works"
        style={{ "--i": activeIndex } as React.CSSProperties}
        className="relative mt-[20px] screen1280:!mt-[28px] grid grid-cols-3 gap-[4px] screen1280:!gap-[6px] p-[4px] screen1280:!p-[6px] rounded-full border border-[#E3EBFF] bg-white/75 screen1280:!bg-white/70"
      >
        <span
          aria-hidden="true"
          className="absolute top-[4px] bottom-[4px] left-[4px] screen1280:!top-[6px] screen1280:!bottom-[6px] screen1280:!left-[6px] rounded-full bg-[#2554D6] shadow-[0_6px_16px_-8px_rgba(37,84,214,0.7)] w-[calc((100%_-_16px)/3)] screen1280:!w-[calc((100%_-_24px)/3)] translate-x-[calc(var(--i)*(100%_+_4px))] screen1280:!translate-x-[calc(var(--i)*(100%_+_6px))] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`insights-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="insights-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                "relative z-[1] h-[44px] rounded-full text-[13px] screen1280:!text-[16px] cursor-pointer",
                "transition-[color,transform] duration-300 active:scale-[0.97]",
                selected ? "text-white font-semibold" : "text-[#37465C] font-medium hover:text-[#2554D6] data-[play]:text-[#2554D6]",
              )}
            >
              <span className="screen744:!hidden">{tab.shortLabel}</span>
              <span className="hidden screen744:!inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="insights-panel"
        aria-labelledby={`insights-tab-${active}`}
        className="mt-[14px] screen1280:!mt-[20px] p-[18px] screen1280:!p-[28px] rounded-[18px] screen1280:!rounded-[20px] bg-white border border-[#E8EEFB] shadow-[0_12px_32px_-18px_rgba(33,46,66,0.18)] flex flex-col"
      >
        <div key={active} className="flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-500 motion-reduce:animate-none">
          <div className="flex items-center justify-between">
            <Image
              src="/images/hero.png"
              alt=""
              width={46}
              height={56}
              className="w-[36px] h-[44px] screen1280:!w-[46px] screen1280:!h-[56px] object-cover"
            />
            <div className="flex gap-[6px] screen1280:!gap-[8px]">{copy.chips}</div>
          </div>
          <h3 className="m-0 mt-[12px] screen1280:!mt-[16px] text-[20px] leading-[26px] screen1280:!text-[26px] screen1280:!leading-[34px] font-bold text-[#212E42]">
            {copy.title}
          </h3>
          <p className="hidden screen1280:!block m-0 mt-[6px] text-[15px] leading-[23px] text-[#37465C]">{copy.subtitle}</p>

          {active === "score" && <ScorePanel />}
          {active === "mistakes" && <MistakesPanel />}
          {active === "format" && <FormatPanel />}
        </div>

        <div className="mt-[16px] screen1280:!mt-[24px] flex flex-col screen1280:!flex-row screen1280:!items-center screen1280:!justify-between gap-[12px]">
          <div className="hidden screen1280:!flex flex-col gap-[2px]">
            <div className="text-[16px] font-bold text-[#212E42]">Try it on your own answer</div>
            <div className="text-[14px] text-[#5B6B82]">Free, with no credit card required.</div>
          </div>
          <Link
            ref={playOnView}
            href="/writing"
            onClick={() => trackCTAClick("Get My Free Score", "insights", { itemId: "insights_free_score" })}
            className="flex items-center justify-center h-[52px] screen1280:!w-[220px] rounded-full bg-[#2554D6] text-white text-[16px] screen1280:!text-[17px] font-medium shadow-[3.7px_3.9px_0_0_#759CFF] transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#1E46B8] data-[play]:bg-[#1E46B8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#759CFF] active:duration-100 motion-reduce:transition-none"
          >
            Get My Free Score
          </Link>
        </div>
      </div>

      {/* AI tutor */}
      <div className="mt-[16px] screen1280:!mt-[24px] p-[18px] screen1280:!px-[28px] screen1280:!py-[24px] rounded-[18px] screen1280:!rounded-[20px] border border-[#E3EBFF] bg-white/85 screen1280:!bg-[linear-gradient(120deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.7)_100%)] flex flex-col gap-[12px] screen1280:!gap-[16px]">
        <h3 className="m-0 text-[17px] leading-[24px] screen1280:!text-[20px] screen1280:!leading-[28px] font-bold text-[#212E42]">
          Stuck on a question? Ask our AI tutor
        </h3>
        <div className="self-end max-w-[270px] screen744:!max-w-[460px] screen1280:!max-w-[640px] px-[14px] py-[10px] screen1280:!px-[18px] screen1280:!py-[12px] rounded-[16px_16px_4px_16px] screen1280:!rounded-[18px_18px_4px_18px] bg-[#2554D6] text-white text-[14px] leading-[21px] screen1280:!text-[16px] screen1280:!leading-[24px]">
          Is this a good first line for my Writing Task 1 email? &quot;Hi, I am writing because I have problem with my order.&quot;
        </div>
        <div className="flex items-end gap-[8px] screen1280:!gap-[12px]">
          <Image
            src="/images/hero.png"
            alt=""
            width={36}
            height={44}
            className="w-[28px] h-[34px] screen1280:!w-[36px] screen1280:!h-[44px] shrink-0 object-cover"
          />
          <div className="screen1280:!max-w-[760px] px-[14px] py-[12px] screen1280:!px-[18px] screen1280:!py-[14px] rounded-[16px_16px_16px_4px] screen1280:!rounded-[18px_18px_18px_4px] bg-white border border-[#E3EBFF] text-[14px] leading-[21px] screen1280:!text-[16px] screen1280:!leading-[25px] text-[#212E42]">
            Good start, but it&apos;s too casual for a complaint. Try:{" "}
            <b className="font-bold">
              &quot;Dear Sir or Madam, I am writing to report a problem with my recent order.&quot;
            </b>{" "}
            You also need &quot;a&quot; before &quot;problem&quot;. A formal greeting and a clear purpose
            <span className="hidden screen1280:!inline"> in your first sentence</span> help your Readability and Task
            Fulfillment scores.
          </div>
        </div>
        <div className="mt-[4px] flex flex-col screen1280:!flex-row screen1280:!items-center screen1280:!justify-between gap-[8px] screen1280:!pt-[18px] screen1280:!border-t border-[#E3EBFF]">
          <div className="hidden screen1280:!flex flex-col gap-[2px]">
            <div className="text-[16px] font-bold text-[#212E42]">Get answers about any CELPIP task</div>
            <div className="text-[14px] text-[#5B6B82]">Your first question is free, no sign-up needed.</div>
          </div>
          <Link
            ref={playOnView}
            href="/learning"
            onClick={() => trackCTAClick("Ask Your Question", "insights", { itemId: "insights_ai_tutor" })}
            className="group/ask flex items-center justify-center gap-[8px] h-[52px] screen1280:!w-[240px] rounded-full bg-white border-[1.5px] border-[#C9D5F5] text-[#2554D6] text-[16px] screen1280:!text-[17px] font-medium transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#2554D6] data-[play]:border-[#2554D6] hover:-translate-y-[2px] data-[play]:-translate-y-[2px] active:translate-y-0 active:scale-[0.98] active:duration-100 motion-reduce:transition-none"
          >
            Ask Your Question
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover/ask:translate-x-[3px] group-data-[play]/ask:translate-x-[3px]">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <div className="screen1280:!hidden text-center text-[13px] text-[#5B6B82]">
            Your first question is free, no sign-up needed.
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserResponseReview;
