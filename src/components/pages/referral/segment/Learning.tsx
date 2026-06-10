import React from "react";

const lessons = [
  {
    skill: "Writing",
    title: "Opinion essay structure",
    status: "To do",
    statusClass: "bg-secondary6 text-secondary2",
    active: true,
  },
  {
    skill: "Speaking",
    title: "Fluency and pacing drills",
    status: "Done",
    statusClass: "bg-success5 text-success",
    active: false,
  },
  {
    skill: "Reading",
    title: "Inference in long passages",
    status: "Done",
    statusClass: "bg-success5 text-success",
    active: false,
  },
  {
    skill: "Listening",
    title: "Note-taking under time pressure",
    status: "To do",
    statusClass: "bg-secondary6 text-secondary2",
    active: false,
  },
] as const;

const Learning = () => {
  return (
    <div className="min-h-[320px] rounded-lg border border-outline pt-2">
      <div className="border-b border-outline px-3 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text3">
          Today&apos;s plan
        </span>
        <p className="mt-1 text-sm font-semibold text-text1">
          Target CLB 9 · 2 of 4 complete
        </p>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {lessons.map((lesson) => (
          <div
            key={lesson.skill}
            className={`rounded-xl border px-3 py-2 ${
              lesson.active
                ? "border-primary5 bg-primary6"
                : "border-outline bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-primary1">
                {lesson.skill}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${lesson.statusClass}`}
              >
                {lesson.status}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-text2">
              {lesson.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Learning;
