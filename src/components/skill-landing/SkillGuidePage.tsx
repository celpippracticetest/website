import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import RollingWords from "@/components/pages/landing/RollingWords";
import { HOMEPAGE_USER_COUNT } from "@/data/homepage-content";
import type { GuideSection, SkillGuide } from "@/data/skill-guides";
import {
  skillLandingTaskHref,
  type SkillLandingAvailableTask,
} from "@/lib/skillLandingTasks";

/**
 * Public guide page for a CELPIP skill (/reading, /writing, /speaking,
 * /listening). Content and section order come from `data/skill-guides`.
 */

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
    <div className="max-w-[760px]">
      <h2 id={id} className="text-[24px] font-extrabold leading-tight tracking-[-0.01em] text-[#212E42] screen744:!text-[30px]">
        {title}
      </h2>
      {intro ? <p className="mt-2 text-[16px] leading-[1.65] text-[#5B6B82]">{intro}</p> : null}
    </div>
  );
}

/** Table cells use " · " to separate parts (e.g. Task 5); show each on its own line. */
function CellLines({ text }: { text: string }) {
  const parts = text.split(" · ");
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part) => (
        <span key={part} className="block">
          {part}
        </span>
      ))}
    </>
  );
}

const SECTION_CLASS = "scroll-mt-24 border-t border-[#E3E8F2] py-12 first:border-t-0 screen744:!py-16";
const CARD_CLASS = "rounded-2xl border border-[#E3E8F2] bg-white";

const ALL_SKILLS = [
  { skill: "listening", title: "Listening", text: "6 parts with real-format audio", href: "/listening" },
  { skill: "reading", title: "Reading", text: "4 parts with timed passages", href: "/reading" },
  { skill: "writing", title: "Writing", text: "Emails and survey responses", href: "/writing" },
  { skill: "speaking", title: "Speaking", text: "All 8 tasks with real timers", href: "/speaking" },
  { skill: "mock", title: "Mock Exams", text: "Full tests under exam conditions", href: "/exam-overview" },
];

function Section({
  section,
  hrefFor,
}: {
  section: GuideSection;
  hrefFor: (taskId: string) => string;
}) {
  const headingId = `${section.id}-heading`;

  switch (section.type) {
    case "practice":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          <ul className={`mt-8 grid gap-4 screen744:!grid-cols-2 ${section.tasks.length > 4 ? "screen1280:!grid-cols-4" : section.tasks.length > 2 ? "screen1024:!grid-cols-4" : ""}`}>
            {section.tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={hrefFor(task.id)}
                  className="group flex h-full flex-col rounded-2xl border border-[#E3E8F2] bg-white p-5 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#C9D5F5] hover:shadow-[0_16px_32px_-20px_rgba(33,46,66,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40"
                >
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2554D6]">{task.label}</span>
                  <h3 className="mt-1.5 text-[17px] font-bold leading-snug text-[#212E42]">{task.name}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-[#5B6B82]">{task.description}</p>
                  {task.chips?.length ? (
                    <p className="mt-4 flex flex-wrap gap-1.5 text-[12px] font-semibold">
                      {task.chips.map((chip, index) => (
                        <span
                          key={chip}
                          className={`rounded-full px-2.5 py-1 ${index === 0 ? "bg-[#F4F7FF] text-[#37465C]" : "bg-[#FFF4EE] text-[#B8431B]"}`}
                        >
                          {chip}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-bold text-[#2554D6]">
                    Start practice
                    <ArrowIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      );

    case "table":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          {/* Table on tablet/desktop */}
          <div className={`${CARD_CLASS} mt-8 hidden overflow-hidden screen744:!block`}>
            <table className="w-full border-collapse text-left text-[15px]">
              <thead className="bg-[#F4F7FF]">
                <tr>
                  {section.columns.map((column) => (
                    <th key={column} scope="col" className="px-5 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[#37465C]">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row[0]} className="border-t border-[#E3E8F2] align-top">
                    {row.map((cell, index) =>
                      index === 0 ? (
                        <th key={index} scope="row" className="px-5 py-4 font-bold text-[#212E42]">
                          {cell}
                        </th>
                      ) : (
                        <td key={index} className="px-5 py-4 leading-[1.55] text-[#37465C]">
                          <CellLines text={cell} />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Stacked rows on phones */}
          <ul className="mt-6 flex flex-col gap-3 screen744:!hidden">
            {section.rows.map((row) => (
              <li key={row[0]} className={`${CARD_CLASS} p-4`}>
                <p className="text-[16px] font-bold text-[#212E42]">{row[0]}</p>
                <dl className="mt-2 flex flex-col gap-1.5">
                  {row.slice(1).map((cell, index) => (
                    <div key={index} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-[14px]">
                      <dt className="font-semibold text-[#5B6B82]">{section.columns[index + 1]}</dt>
                      <dd className="text-[#37465C]">
                        <CellLines text={cell} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      );

    case "cards":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          <ul className={`mt-8 grid gap-4 screen744:!grid-cols-2 ${section.items.length > 4 ? "screen1280:!grid-cols-3" : ""}`}>
            {section.items.map((item) => (
              <li key={item.title} className={`${CARD_CLASS} flex flex-col p-5 screen744:!p-6`}>
                <h3 className="text-[17px] font-bold leading-snug text-[#212E42]">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#5B6B82]">{item.text}</p>
                {item.focus ? (
                  <p className="mt-4 rounded-xl bg-[#F4F7FF] px-4 py-3 text-[14px] leading-[1.55] text-[#37465C]">
                    <span className="font-bold text-[#1B3FA8]">What to focus on: </span>
                    {item.focus}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      );

    case "tips":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          <ol className="mt-8 grid gap-3 screen1024:!grid-cols-2">
            {section.items.map((item, index) => (
              <li key={index} className={`${CARD_CLASS} flex gap-4 p-5`}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EEF3FF] text-[14px] font-bold text-[#2554D6]">
                  {index + 1}
                </span>
                <span className="text-[15px] leading-[1.6] text-[#37465C]">
                  {item.title ? <span className="block text-[16px] font-bold text-[#212E42]">{item.title}</span> : null}
                  <span className={item.title ? "mt-1 block" : ""}>{item.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {section.outro ? <p className="mt-6 max-w-[760px] text-[15px] leading-[1.6] text-[#5B6B82]">{section.outro}</p> : null}
        </section>
      );

    case "sample":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          {section.sample ? (
            <div className="mt-8 grid overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white screen1024:!grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="p-6 screen744:!p-8">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#2554D6]">{section.sample.task}</p>
                <p className="mt-2 text-[16px] font-semibold leading-snug text-[#212E42]">{section.sample.question}</p>
                <blockquote className="mt-5 border-l-4 border-[#C9D5F5] pl-4 text-[15.5px] italic leading-[1.75] text-[#37465C]">
                  &ldquo;{section.sample.answer}&rdquo;
                </blockquote>
              </div>
              <div className="border-t border-[#E3E8F2] bg-[#ECF9F2] p-6 screen744:!p-8 screen1024:!border-l screen1024:!border-t-0">
                <p className="text-[16px] font-bold text-[#08603F]">Why it works</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {section.sample.whyItWorks.map((point) => (
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
          ) : null}
          {section.links?.length ? (
            <ul className={`grid gap-3 screen744:!grid-cols-2 ${section.links.length > 2 ? "screen1024:!grid-cols-4" : ""} ${section.sample ? "mt-4" : "mt-8"}`}>
              {section.links.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.taskId ? hrefFor(link.taskId) : (link.href ?? "#")}
                    className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-[#E3E8F2] bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-[#C9D5F5] hover:shadow-[0_12px_24px_-18px_rgba(33,46,66,0.35)]"
                  >
                    <span>
                      <span className="block text-[15px] font-bold text-[#212E42]">{link.title}</span>
                      <span className="mt-0.5 block text-[13.5px] text-[#5B6B82]">{link.text}</span>
                    </span>
                    <ArrowIcon className="size-4 shrink-0 text-[#2554D6] transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      );

    case "scoring":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} />
          <div className="mt-3 flex max-w-[760px] flex-col gap-3">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[16px] leading-[1.65] text-[#5B6B82]">
                {paragraph}
              </p>
            ))}
          </div>
          {section.criteria?.length ? (
            <ul className="mt-8 grid gap-4 screen744:!grid-cols-2 screen1280:!grid-cols-4">
              {section.criteria.map((item, index) => (
                <li key={item.title} className={`${CARD_CLASS} p-5`}>
                  <span className="text-[28px] font-extrabold leading-none text-[#C9D5F5]">0{index + 1}</span>
                  <h3 className="mt-3 text-[17px] font-bold text-[#212E42]">{item.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[#5B6B82]">{item.text}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {section.subsections?.length ? (
            <div className="mt-8 grid gap-4 screen1024:!grid-cols-2">
              {section.subsections.map((sub) => (
                <div key={sub.title} className={`${CARD_CLASS} p-6`}>
                  <h3 className="text-[17px] font-bold leading-snug text-[#212E42]">{sub.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[#5B6B82]">{sub.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      );

    case "list":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          <ul className="mt-8 grid gap-3 screen744:!grid-cols-2">
            {section.items.map((item) => (
              <li key={item.title ?? item.text} className={`${CARD_CLASS} flex gap-3 p-4`}>
                <span className="mt-[7px] size-2 shrink-0 rounded-full bg-[#2554D6]" />
                <span className="text-[15px] leading-[1.6] text-[#5B6B82]">
                  {item.title ? <span className="font-bold text-[#212E42]">{item.title}: </span> : null}
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "checklist":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          <ul className="mt-8 grid gap-3 screen744:!grid-cols-2">
            {section.items.map((item) => (
              <li key={item} className={`${CARD_CLASS} flex items-start gap-3 p-4`}>
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#0B7A55] text-white">
                  <CheckIcon className="size-3.5" />
                </span>
                <span className="text-[15px] leading-[1.55] text-[#37465C]">{item}</span>
              </li>
            ))}
          </ul>
          {section.outro ? <p className="mt-6 max-w-[760px] text-[15px] leading-[1.6] text-[#5B6B82]">{section.outro}</p> : null}
        </section>
      );

    case "faq":
      return (
        <section id={section.id} aria-labelledby={headingId} className={SECTION_CLASS}>
          <SectionHeading id={headingId} title={section.title} intro={section.intro} />
          <div className="mt-8 flex max-w-[880px] flex-col gap-3">
            {section.items.map((faq) => (
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
      );
  }
}

export default function SkillGuidePage({
  guide,
  availableTasks,
}: {
  guide: SkillGuide;
  availableTasks: SkillLandingAvailableTask[];
}) {
  const hrefFor = (taskId: string) => skillLandingTaskHref(guide.skill, taskId, availableTasks);
  const startHref = hrefFor("1");
  const skillName = guide.skill.charAt(0).toUpperCase() + guide.skill.slice(1);
  const faq = guide.sections.find((section) => section.type === "faq");

  const faqSchema =
    faq?.type === "faq"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;

  return (
    <div className="w-full bg-[#F4F7FF] pb-24">
      {faqSchema ? <JsonLd data={faqSchema} /> : null}

      {/* Hero */}
      <section className="border-b border-[#E3E8F2] bg-[linear-gradient(180deg,#FFFFFF_0%,#F4F7FF_100%)]">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-12 screen744:!px-6 screen1024:!grid-cols-[minmax(0,1fr)_420px] screen1024:!py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#EEF3FF] px-3 py-1 text-[13px] font-semibold text-[#2554D6]">
              <span className="size-1.5 rounded-full bg-[#2554D6]" />
              {guide.badge}
            </p>
            <h1 className="mt-4 text-[32px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#212E42] screen744:!text-[44px]">
              {guide.title}
            </h1>
            <p className="mt-4 max-w-[640px] text-[16px] leading-[1.7] text-[#5B6B82]">{guide.intro}</p>
            <div className="mt-7 flex flex-col gap-3 screen744:!flex-row screen744:!items-center">
              <Link
                href={startHref}
                className="group/start inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#2554D6] px-7 text-[16px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(37,84,214,0.8)] transition-[background-color,transform] duration-200 ease-out hover:bg-[#1B3FA8] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2554D6]/40 focus-visible:ring-offset-2"
              >
                <RollingWords text="Start Free Practice" />
                <ArrowIcon className="size-4 transition-transform duration-200 group-hover/start:translate-x-0.5" />
              </Link>
              <a
                href="#practice"
                className="inline-flex h-[52px] items-center justify-center rounded-full border border-[#C9D5F5] bg-white px-7 text-[16px] font-semibold text-[#212E42] transition-colors duration-200 hover:border-[#2554D6] hover:text-[#2554D6]"
              >
                See all {guide.skill === "writing" || guide.skill === "speaking" ? "tasks" : "parts"}
              </a>
            </div>
            <p className="mt-5 text-[14px] text-[#5B6B82]">
              <span className="font-bold text-[#212E42]">{HOMEPAGE_USER_COUNT}</span> test takers practise with us · No credit card required
            </p>
          </div>

          {/* Practice screen preview */}
          <div aria-hidden="true" className="relative mx-auto w-full max-w-[420px]">
            <div className="rounded-3xl border border-[#E3E8F2] bg-white p-5 shadow-[0_24px_48px_-28px_rgba(33,46,66,0.35)]">
              <span className="rounded-full bg-[#EEF3FF] px-3 py-1 text-[12px] font-bold text-[#2554D6]">{guide.hero.taskLabel}</span>
              <p className="mt-4 text-[15px] font-semibold leading-snug text-[#212E42]">{guide.hero.prompt}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {guide.hero.stats.map((stat, index) => (
                  <div key={stat.label} className={`rounded-2xl p-3 ${index === 0 ? "bg-[#F4F7FF]" : "bg-[#FFF4EE]"}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${index === 0 ? "text-[#5B6B82]" : "text-[#B8431B]"}`}>{stat.label}</p>
                    <p className={`mt-1 text-[22px] font-extrabold tabular-nums ${index === 0 ? "text-[#212E42]" : "text-[#B8431B]"}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              {guide.hero.visual === "wave" ? (
                <div className="mt-5 flex h-12 items-center gap-[3px]">
                  {[30, 55, 40, 75, 50, 90, 60, 35, 70, 45, 85, 55, 30, 65, 40, 80, 50, 35, 60, 45, 25, 55, 40, 30].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} className={`w-full rounded-full ${i < 15 ? "bg-[#2554D6]" : "bg-[#C9D5F5]"}`} />
                  ))}
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-2">
                  {["w-full", "w-11/12", "w-full", "w-4/5", "w-2/3"].map((width, i) => (
                    <span key={i} className={`h-2.5 rounded-full ${width} ${i < 3 ? "bg-[#C9D5F5]" : "bg-[#E3E8F2]"}`} />
                  ))}
                </div>
              )}
            </div>
            <div className="absolute -bottom-6 -left-4 flex items-center gap-2 rounded-2xl border border-[#BFE7D3] bg-white px-3 py-2 shadow-[0_12px_24px_-16px_rgba(33,46,66,0.4)] screen744:!-left-8">
              <img src="/images/BeaverAiReview.png" alt="" width={44} height={44} className="size-11" />
              <div>
                <p className="text-[12px] font-bold text-[#0B7A55]">Instant feedback</p>
                <p className="text-[11px] text-[#5B6B82]">{guide.hero.feedbackLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 screen744:!px-6">
        {guide.sections.map((section) => (
          <Section key={section.id} section={section} hrefFor={hrefFor} />
        ))}

        {/* Final CTA + other skills */}
        <section aria-labelledby="more-heading" className="border-t border-[#E3E8F2] pt-12 screen744:!pt-16">
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-[#2554D6] px-6 py-8 text-white screen744:!flex-row screen744:!items-center screen744:!justify-between screen744:!px-10">
            <div>
              <p className="text-[22px] font-extrabold leading-tight screen744:!text-[26px]">Ready to raise your {skillName} score?</p>
              <p className="mt-1.5 text-[15px] text-white/85">Start with free practice and see your results right away.</p>
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
            {ALL_SKILLS.filter((item) => item.skill !== guide.skill).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-[#E3E8F2] bg-white p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#C9D5F5] hover:shadow-[0_12px_24px_-18px_rgba(33,46,66,0.35)]"
                >
                  <span>
                    <span className="block text-[16px] font-bold text-[#212E42]">{item.title}</span>
                    <span className="mt-0.5 block text-[13.5px] text-[#5B6B82]">{item.text}</span>
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
