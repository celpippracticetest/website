import Link from "next/link";

/** One href per URL — natural copy carries long-tail terms (avoids duplicate links). */
const HUB_LINKS = [
  {
    href: "/reading",
    label: "Reading practice test",
    blurb: "Full CELPIP reading practice with all task types and scored feedback.",
  },
  {
    href: "/listening",
    label: "Listening practice test",
    blurb: "CELPIP listening test format: audio, timing, and answer review.",
  },
  {
    href: "/writing",
    label: "Writing practice",
    blurb: "Email and survey tasks with AI feedback on your responses.",
  },
  {
    href: "/speaking",
    label: "Speaking practice",
    blurb: "Timed prompts aligned with the real speaking section.",
  },
] as const;

const TOOL_LINKS = [
  {
    href: "/score-calculator",
    label: "Score calculator",
    blurb:
      "Map Listening, Reading, Writing, and Speaking to CLB-style levels and overall estimates.",
  },
  {
    href: "/wiki/celpip-writing-task-2-template",
    label: "Writing Task 2 guide",
    blurb:
      "Survey-response framework with sample sentences and vocabulary for Task 2.",
  },
] as const;

/**
 * Crawlable internal links to skill hubs and tools (one link per destination).
 */
export default function PracticeExamSkillLinks() {
  return (
    <section
      className="max-w-[1160px] mx-auto px-4 screen1280:px-10 py-10 screen1280:py-14"
      aria-labelledby="practice-exam-skills-heading"
    >
      <h2
        id="practice-exam-skills-heading"
        className="text-[18px] screen1280:text-[22px] font-semibold text-[#212E42] mb-2"
      >
        Practice by skill
      </h2>
      <p className="text-[14px] screen1280:text-[16px] text-[#5C6B7A] mb-6 max-w-[800px] leading-relaxed">
        Prepare for the CELPIP test with free section hubs: reading practice
        tests, listening simulations, writing and speaking tasks, and instant
        CELPIP results on practice attempts. Browse below without signing up.
      </p>

      <h3 className="text-[15px] screen1280:text-[16px] font-semibold text-[#212E42] mb-3">
        Listening, reading, writing &amp; speaking
      </h3>
      <ul className="flex flex-col gap-4 mb-8">
        {HUB_LINKS.map(({ href, label, blurb }) => (
          <li key={href} className="max-w-[800px]">
            <Link
              href={href}
              className="text-[15px] font-semibold text-[#3B5BDB] underline underline-offset-2 hover:text-[#2F4AC4]"
            >
              {label}
            </Link>
            <span className="text-[14px] text-[#5C6B7A]"> — {blurb}</span>
          </li>
        ))}
      </ul>

      <h3 className="text-[15px] screen1280:text-[16px] font-semibold text-[#212E42] mb-3">
        Score calculator &amp; Writing Task 2
      </h3>
      <ul className="flex flex-col gap-4">
        {TOOL_LINKS.map(({ href, label, blurb }) => (
          <li key={href} className="max-w-[800px]">
            <Link
              href={href}
              className="text-[15px] font-semibold text-[#3B5BDB] underline underline-offset-2 hover:text-[#2F4AC4]"
            >
              {label}
            </Link>
            <span className="text-[14px] text-[#5C6B7A]"> — {blurb}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
