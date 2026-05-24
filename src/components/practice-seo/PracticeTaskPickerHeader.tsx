import type { TTaskSchemaDto } from "@/models/tasks.model";

type PracticeTaskPickerHeaderProps = {
  skillLabel: string;
  task: TTaskSchemaDto;
};

/** Server-rendered heading so LCP is not blocked by client practice UI hydration. */
export function PracticeTaskPickerHeader({
  skillLabel,
  task,
}: PracticeTaskPickerHeaderProps) {
  const partLabel = task.taskNumber.replace("Task #", "Part");

  return (
    <header className="mx-auto w-full max-w-xl px-6 pt-6">
      <p className="text-sm font-normal text-[#76808F]">
        {skillLabel} - {partLabel}
      </p>
      <h1 className="pt-2 text-base font-semibold leading-5 tracking-wide text-[#212E42]">
        {task.name}
      </h1>
    </header>
  );
}
