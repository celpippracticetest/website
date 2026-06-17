const practiceOverviewNavy = "#1B2B5A";
const practiceOverviewMuted = "#475569";

/** SEO copy for signed-out visitors — server-rendered for LCP and crawlers. */
export default function PracticeOverviewSeoSection() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 pb-4 pt-3">
      <h2
        className="text-[1.75rem] font-extrabold tracking-tight screen744:text-[2.125rem]"
        style={{ color: practiceOverviewNavy }}
      >
        CELPIP Practice Test — By Skill
      </h2>
      <p
        className="mt-3 text-base leading-relaxed screen744:text-[1rem]"
        style={{ color: practiceOverviewMuted }}
      >
        Choose focused CELPIP practice by skill and train with realistic task formats for
        Listening, Reading, Writing, and Speaking. This page helps you plan daily study, pick the
        next task quickly, and build confidence before full mock exams.
      </p>
      <p className="mt-4 text-base leading-relaxed" style={{ color: practiceOverviewMuted }}>
        The most effective preparation combines deliberate practice and repetition. Start with
        your weakest skill, complete one timed task, and review every incorrect answer or weak
        response. Then move to a second skill to improve stamina and concentration across
        multiple sections, similar to the real CELPIP exam experience.
      </p>
      <p className="mt-4 text-base leading-relaxed" style={{ color: practiceOverviewMuted }}>
        Use short cycles: practice, review, correct, and repeat. In Listening and Reading, track
        question types you miss most often. In Writing and Speaking, focus on structure,
        grammar control, and idea development. Small targeted improvements in each cycle are
        more reliable than random high-volume practice.
      </p>
      <p className="mt-4 text-base leading-relaxed" style={{ color: practiceOverviewMuted }}>
        If your exam date is close, prioritize consistency over intensity. Daily focused sessions
        of 45 to 90 minutes usually outperform occasional long sessions. Keep notes on recurring
        mistakes, revisit them weekly, and measure progress by accuracy, timing, and confidence
        under test-like conditions.
      </p>
    </section>
  );
}
