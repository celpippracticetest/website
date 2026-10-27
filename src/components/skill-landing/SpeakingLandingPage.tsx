import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import RollingWords from "@/components/pages/landing/RollingWords";
import { HOMEPAGE_USER_COUNT } from "@/data/homepage-content";
import {
  SPEAKING_FAQS,
  SPEAKING_FORMAT_ROWS,
  SPEAKING_PRACTICE_TIPS,
  SPEAKING_SAMPLE,
  SPEAKING_SCORING,
  SPEAKING_TASKS,
  SPEAKING_TOPICS,
} from "@/data/speaking-landing";
import {
  skillLandingTaskHref,
  type SkillLandingAvailableTask,
} from "@/lib/skillLandingTasks";

function seconds(value: number): string {
  return value >= 60 && value % 60 === 0 ? `${value / 60} min` : `${value}s`;
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ArrowIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function SectionHeading({ id, title, intro }: { id: string; title: string; intro?: string }) {
  return (
    <div className="max-w-[720px]">
      <h2 id={id} className="text-[24px] font-extrabold leading-tight tracking-[-0.01em] text-[#212E42] screen744:!text-[30px]">
        {title}
      </h2>
      {intro ? <p className="mt-2 text-[16px] leading-[1.6] text-[#5B6B82]">{intro}</p> : null}
    </div>
  );
}

const SECTION_CLASS = "scroll-mt-24 py-12 screen744:!py-16";

const OTHER_SKILLS = [
  { title: "Listening", text: "6 parts with real-format audio", href: "/listening" },
  { title: "Reading", text: "4 parts with timed passages", href: "/reading" },
  { title: "Writing", text: "Emails and survey responses", href: "/writing" },
  { title: "Mock Exams", text: "Full tests under exam conditions", href: "/exam-overview" },
];

export default function SpeakingLandingPage({
  availableTasks,
}: {
  availableTasks: SkillLandingAvailableTask[];
}) {
  const hrefFor = (taskId: string) => skillLandingTaskHref("speaking", taskId, availableTasks);
  const startHref = hrefFor("1");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SPEAKING_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div className="w-full bg-[#F4F7FF] pb-24">
      <JsonLd data={faqSchema} />

      {/* Hero */}
      <section className="border-b border-[#E3E8F2] bg-[linear-gradient(180deg,#FFFFFF_0%,#F4F7FF_100%)]">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-12 screen744:!px-6 screen1024:!grid-cols-[minmax(0,1fr)_440px] screen1024:!py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#EEF3FF] px-3 py-1 text-[13px] font-semibold text-[#2554D6]">
              <span className="size-1.5 rounded-full bg-[#2554D6]" />
              All 8 tasks · Real exam timing
            </p>
            <h1 className="mt-4 text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#212E42] screen744:!text-[46px]">
              CELPIP Speaking Practice Test 2026 – Free Online Practice
            </h1>
            <p className="mt-4 max-w-[560px] text-[17px] leading-[1.65] text-[#5B6B82]">
              Practise all 8 CELPIP Speaking tasks with realistic prompts, the real prep and speaking
              timers, and instant AI feedback on every answer.
            </p>
            <div className="mt-7 flex flex-col gap-3 screen744:!flex-row screen744:!items-center">
              <Link
                href={startHref}
                className="group/start inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#2554D6] px-7 text-[16px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(37,84,214,0.8)] transition-[background-color,transform] duration-200 ease-out hover:bg-[#1B3FA8] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40 focus-visible:ring-offset-2"
              >
                <RollingWords text="Start Free Practice" />
                <ArrowIcon className="size-4 transition-transform duration-200 group-hover/start:translate-x-0.5" />
              </Link>
              <a
                href="#tasks"
                className="inline-flex h-[52px] items-center justify-center rounded-full border border-[#C9D5F5] bg-white px-7 text-[16px] font-semibold text-[#212E42] transition-colors duration-200 hover:border-[#2554D6] hover:text-[#2554D6]"
              >
                See all 8 tasks
              </a>
            </div>
            <p className="mt-5 text-[14px] text-[#5B6B82]">
              <span className="font-bold text-[#212E42]">{HOMEPAGE_USER_COUNT}</span> test takers practise with us · No credit card required
            </p>
          </div>

          {/* Practice screen preview */}
          <div aria-hidden="true" className="relative mx-auto w-full max-w-[440px]">
            <div className="rounded-3xl border border-[#E3E8F2] bg-white p-5 shadow-[0_24px_48px_-28px_rgba(33,46,66,0.35)]">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#EEF3FF] px-3 py-1 text-[12px] font-bold text-[#2554D6]">Task 1 · Giving Advice</span>
                <span className="text-[12px] font-semibold text-[#5B6B82]">Recording</span>
              </div>
              <p className="mt-4 text-[15px] font-semibold leading-snug text-[#212E42]">
                Your friend is moving to a new city and feels nervous. Advise your friend on how to settle in.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F4F7FF] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6B82]">Preparation</p>
                  <p className="mt-1 text-[22px] font-extrabold tabular-nums text-[#212E42]">0:30</p>
                </div>
                <div className="rounded-2xl bg-[#FFF4EE] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#B8431B]">Speaking</p>
                  <p className="mt-1 text-[22px] font-extrabold tabular-nums text-[#B8431B]">1:12</p>
                </div>
              </div>
              <div className="mt-5 flex h-12 items-center gap-[3px]">
                {[30, 55, 40, 75, 50, 90, 60, 35, 70, 45, 85, 55, 30, 65, 40, 80, 50, 35, 60, 45, 25, 55, 40, 30].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-full rounded-full ${i < 15 ? "bg-[#2554D6]" : "bg-[#C9D5F5]"}`}
                  />
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 flex items-center gap-2 rounded-2xl border border-[#BFE7D3] bg-white px-3 py-2 shadow-[0_12px_24px_-16px_rgba(33,46,66,0.4)] screen744:!-left-8">
              <img src="/images/BeaverAiReview.png" alt="" width={44} height={44} className="size-11" />
              <div>
                <p className="text-[12px] font-bold text-[#0B7A55]">AI feedback ready</p>
                <p className="text-[11px] text-[#5B6B82]">Vocabulary · Listenability</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 screen744:!px-6">
        {/* Tasks */}
        <section id="tasks" aria-labelledby="tasks-heading" className={SECTION_CLASS}>
          <SectionHeading
            id="tasks-heading"
            title="Practise all 8 CELPIP Speaking tasks"
            intro="Each task has its own prep and speaking time, just like the real test. Pick a task to start with real prompts."
          />
          <ul className="mt-8 grid gap-4 screen744:!grid-cols-2 screen1280:!grid-cols-4">
            {SPEAKING_TASKS.map((task) => (
              <li key={task.id}>
                <Link
                  href={hrefFor(task.id)}
                  className="group flex h-full flex-col rounded-2xl border border-[#E3E8F2] bg-white p-5 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#C9D5F5] hover:shadow-[0_16px_32px_-20px_rgba(33,46,66,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40"
                >
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2554D6]">Task {task.id}</span>
                  <h3 className="mt-1.5 text-[17px] font-bold leading-snug text-[#212E42]">{task.name}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-[#5B6B82]">{task.description}</p>
                  <p className="mt-4 flex flex-wrap gap-1.5 text-[12px] font-semibold">
                    <span className="rounded-full bg-[#F4F7FF] px-2.5 py-1 text-[#37465C]">Prep {seconds(task.prepSeconds)}</span>
                    <span className="rounded-full bg-[#FFF4EE] px-2.5 py-1 text-[#B8431B]">Speak {seconds(task.speakSeconds)}</span>
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-bold text-[#2554D6]">
                    Start practice
                    <ArrowIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Format */}
        <section aria-labelledby="format-heading" className={`${SECTION_CLASS} grid gap-8 border-t border-[#E3E8F2] screen1024:!grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] screen1024:!items-start`}>
          <SectionHeading
            id="format-heading"
            title="CELPIP Speaking test format"
            intro="A quick overview of the Speaking section: how many tasks there are, how long you get, and how you answer."
          />
          <dl className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white">
            {SPEAKING_FORMAT_ROWS.map((row, index) => (
              <div
                key={row.label}
                className={`grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 px-5 py-3.5 text-[15px] ${index > 0 ? "border-t border-[#E3E8F2]" : ""}`}
              >
                <dt className="font-semibold text-[#5B6B82]">{row.label}</dt>
                <dd className="font-semibold text-[#212E42]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* How to practise */}
        <section aria-labelledby="practice-heading" className={`${SECTION_CLASS} border-t border-[#E3E8F2]`}>
          <SectionHeading
            id="practice-heading"
            title="How to practise CELPIP Speaking effectively"
            intro="Small habits make the biggest difference. Use these in every session."
          />
          <div className="mt-8 grid gap-4 screen1024:!grid-cols-[minmax(0,1fr)_340px]">
            <ol className="grid gap-3 screen744:!grid-cols-2">
              {SPEAKING_PRACTICE_TIPS.map((tip, index) => (
                <li key={tip} className="flex gap-3 rounded-2xl border border-[#E3E8F2] bg-white p-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#EEF3FF] text-[13px] font-bold text-[#2554D6]">
                    {index + 1}
                  </span>
                  <span className="text-[15px] leading-[1.55] text-[#37465C]">{tip}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col justify-between rounded-2xl bg-[#212E42] p-6 text-white">
              <div>
                <p className="text-[18px] font-bold leading-snug">Want a full study plan?</p>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/75">
                  Our blog has step-by-step guides, sample answers and score-boosting strategies for every CELPIP skill.
                </p>
              </div>
              <Link
                href="/blog"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-bold text-[#212E42] transition-colors duration-200 hover:bg-[#EEF3FF]"
              >
                Read the guides
                <ArrowIcon className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Sample answer */}
        <section aria-labelledby="sample-heading" className={`${SECTION_CLASS} border-t border-[#E3E8F2]`}>
          <SectionHeading
            id="sample-heading"
            title="CELPIP Speaking sample answer"
            intro="A strong response to a real-format prompt, and what makes it work."
          />
          <div className="mt-8 grid overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white screen1024:!grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="p-6 screen744:!p-8">
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2554D6]">{SPEAKING_SAMPLE.task}</p>
              <p className="mt-2 text-[16px] font-semibold leading-snug text-[#212E42]">{SPEAKING_SAMPLE.question}</p>
              <blockquote className="mt-5 border-l-4 border-[#C9D5F5] pl-4 text-[15.5px] italic leading-[1.75] text-[#37465C]">
                &ldquo;{SPEAKING_SAMPLE.answer}&rdquo;
              </blockquote>
            </div>
            <div className="border-t border-[#E3E8F2] bg-[#ECF9F2] p-6 screen744:!p-8 screen1024:!border-l screen1024:!border-t-0">
              <p className="text-[16px] font-bold text-[#08603F]">Why it works</p>
              <ul className="mt-4 flex flex-col gap-3">
                {SPEAKING_SAMPLE.whyItWorks.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[15px] leading-[1.5] text-[#2F4A3F]">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#0B7A55] text-white">
                      <CheckIcon className="size-3" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Scoring */}
        <section aria-labelledby="scoring-heading" className={`${SECTION_CLASS} border-t border-[#E3E8F2]`}>
          <SectionHeading
            id="scoring-heading"
            title="How is CELPIP Speaking scored?"
            intro="Raters score every recording on four criteria. Our AI feedback scores your practice answers on the same four areas."
          />
          <ul className="mt-8 grid gap-4 screen744:!grid-cols-2 screen1280:!grid-cols-4">
            {SPEAKING_SCORING.map((item, index) => (
              <li key={item.title} className="rounded-2xl border border-[#E3E8F2] bg-white p-5">
                <span className="text-[28px] font-extrabold leading-none text-[#C9D5F5]">0{index + 1}</span>
                <h3 className="mt-3 text-[17px] font-bold text-[#212E42]">{item.title}</h3>
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[#5B6B82]">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Topics */}
        <section aria-labelledby="topics-heading" className={`${SECTION_CLASS} border-t border-[#E3E8F2]`}>
          <SectionHeading
            id="topics-heading"
            title="Common CELPIP Speaking topics"
            intro="Prompts come from everyday Canadian life. Make sure you can talk comfortably about each of these."
          />
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {SPEAKING_TOPICS.map((topic) => (
              <li key={topic} className="rounded-full border border-[#E3E8F2] bg-white px-4 py-2 text-[14px] font-medium text-[#37465C]">
                {topic}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className={`${SECTION_CLASS} border-t border-[#E3E8F2]`}>
          <SectionHeading id="faq-heading" title="Frequently asked questions" />
          <div className="mt-8 flex max-w-[880px] flex-col gap-3">
            {SPEAKING_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-[#E3E8F2] bg-white transition-colors open:border-[#C9D5F5]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-[16px] font-semibold text-[#212E42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#F4F7FF] text-[#2554D6] transition-transform duration-200 group-open:rotate-45">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="size-3.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[15px] leading-[1.65] text-[#5B6B82]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA + other skills */}
        <section aria-labelledby="more-heading" className="border-t border-[#E3E8F2] pt-12 screen744:!pt-16">
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-[#2554D6] px-6 py-8 text-white screen744:!flex-row screen744:!items-center screen744:!justify-between screen744:!px-10">
            <div>
              <p className="text-[22px] font-extrabold leading-tight screen744:!text-[26px]">Ready to hear your progress?</p>
              <p className="mt-1.5 text-[15px] text-white/85">Start with Task 1 and get AI feedback in minutes.</p>
            </div>
            <Link
              href={startHref}
              className="group/start inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-[#212E42] transition-[background-color,transform] duration-200 ease-out hover:bg-[#EEF3FF] active:scale-[0.97] screen744:!w-auto"
            >
              <RollingWords text="Start Free Practice" />
              <ArrowIcon className="size-4" />
            </Link>
          </div>
          <h2 id="more-heading" className="mt-12 text-[20px] font-extrabold text-[#212E42]">
            Keep practising other skills
          </h2>
          <ul className="mt-5 grid gap-4 screen744:!grid-cols-2 screen1280:!grid-cols-4">
            {OTHER_SKILLS.map((skill) => (
              <li key={skill.href}>
                <Link
                  href={skill.href}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-[#E3E8F2] bg-white p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#C9D5F5] hover:shadow-[0_12px_24px_-18px_rgba(33,46,66,0.35)]"
                >
                  <span>
                    <span className="block text-[16px] font-bold text-[#212E42]">{skill.title}</span>
                    <span className="mt-0.5 block text-[13.5px] text-[#5B6B82]">{skill.text}</span>
                  </span>
                  <ArrowIcon className="size-4 shrink-0 text-[#2554D6] transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
