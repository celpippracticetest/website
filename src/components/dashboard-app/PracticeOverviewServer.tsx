import Link from "next/link";
import {
  categoryToSkillRoute,
  taskPickerPath,
  type SkillRoute,
} from "@/lib/practiceRoutes";
import type { PracticeTasksBySkill } from "@/lib/practiceTasks";
import type { TTaskSchemaDto } from "@/models/tasks.model";

const practiceNavy = "#1B2B5A";

const SECTIONS: {
  title: string;
  key: keyof PracticeTasksBySkill;
  iconBg: string;
}[] = [
  { title: "Listening", key: "listening", iconBg: "#E6F6F4" },
  { title: "Reading", key: "reading", iconBg: "#FEECEF" },
  { title: "Writing", key: "writing", iconBg: "#FFF1EE" },
  { title: "Speaking", key: "speaking", iconBg: "#F1E9FE" },
];

function sortTasks(tasks: TTaskSchemaDto[]): TTaskSchemaDto[] {
  return [...tasks].sort((a, b) => {
    const numA = parseInt(a.taskNumber.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.taskNumber.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });
}

function taskHref(task: TTaskSchemaDto): string {
  const skill = categoryToSkillRoute(task.category) as SkillRoute;
  return taskPickerPath(skill, task.id);
}

export default function PracticeOverviewServer({
  tasks,
}: {
  tasks: PracticeTasksBySkill;
}) {
  const sections = SECTIONS.map((section) => ({
    ...section,
    tasks: sortTasks(tasks[section.key] ?? []),
  }));

  return (
    <main
      className="mb-[120px] flex min-h-full w-full flex-col items-end"
      style={{
        background:
          "linear-gradient(135deg, #FAFBFF 0%, #EEF2FF 50%, #F8FAFC 100%)",
      }}
    >
      <div className="w-full max-w-[1200px] px-4 pb-12 pt-4 xl:px-5 xl:pt-6">
        <h1
          className="mb-6 text-[1.75rem] font-extrabold leading-tight screen744:text-[2rem]"
          style={{ color: practiceNavy }}
        >
          CELPIP Practice by Skill
        </h1>

        {/* Desktop: four-column task grid (LCP-friendly server HTML) */}
        <div className="hidden gap-8 xl:grid xl:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-4">
              <h2
                className="text-center text-xl font-extrabold"
                style={{ color: practiceNavy }}
              >
                {section.title}
              </h2>
              <ul className="flex flex-col gap-3">
                {section.tasks.map((task, index) => (
                  <li key={task.id}>
                    <Link
                      href={taskHref(task)}
                      className="block rounded-2xl border border-[rgba(27,43,90,0.10)] bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_20px_48px_rgba(15,23,42,0.10)]"
                    >
                      <span className="mb-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                        Task {index + 1}
                      </span>
                      <span
                        className="block text-lg font-bold leading-snug"
                        style={{ color: practiceNavy }}
                      >
                        {task.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Mobile: native details/summary — no JS required for first paint */}
        <div className="flex flex-col gap-3 xl:hidden">
          {sections.map((section) => (
            <details
              key={section.title}
              open
              className="overflow-hidden rounded-2xl border border-[rgba(27,43,90,0.10)] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]"
            >
              <summary
                className="cursor-pointer list-none px-4 py-3 text-lg font-bold [&::-webkit-details-marker]:hidden"
                style={{ color: practiceNavy }}
              >
                {section.title}
              </summary>
              <ul
                className="grid grid-cols-1 gap-3 border-t border-[rgba(27,43,90,0.08)] p-4 sm:grid-cols-2"
                style={{ backgroundColor: section.iconBg }}
              >
                {section.tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={taskHref(task)}
                      className="block rounded-xl border border-[rgba(27,43,90,0.10)] bg-white p-4"
                    >
                      <span className="mb-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {task.taskNumber}
                      </span>
                      <span
                        className="block text-lg font-bold leading-snug"
                        style={{ color: practiceNavy }}
                      >
                        {task.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
