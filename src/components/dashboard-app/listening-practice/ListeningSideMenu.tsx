import { TPracticeDto } from "@/models/practice.model";
import { Badge } from "@/components/ui/badge";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { useUser } from "@clerk/nextjs";
import SvgCheckSquare from "@/components/icons/CheckSquare";
import SvgLock from "@/components/icons/Lock";
import SvgPlay from "@/components/icons/Play";
import SvgConfirmCheck from "@/components/icons/ConfirmCheck";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

const ListeningSideMenu = ({
  completedPractice,
  allPractices,
  selectedPracticeId,
  selectedTaskId,
}: {
  practice: TPracticeDto;
  task: TTaskSchemaDto;
  allPractices: TPracticeDto[];
  completedPractice: string[];
  isPlaying: boolean;
  isCompleted: boolean;
  onBackClick: () => void;
  selectedPracticeId: string | null;
  selectedTaskId: string | null;
}) => {
  const { user } = useUser();

  return (
    <aside className="sticky top-0 hidden bg-white screen1280:!h-[920px] overflow-auto screen1280:!flex shrink-0 border-[1px] border-[#D5D6D8] max-w-[305px] rounded-lg w-full flex-col items-center ">
      <div className="bg-white gap-[16px] overflow-y-auto  flex flex-col w-full [&::-webkit-scrollbar]:w-2 p-[16px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-track]:bg-slate-100">
        {allPractices.map((p: TPracticeDto, index: number) => (
          <a
            key={index}
            className={`${
              completedPractice.includes(p.id) ? "h-[33px]" : "h-[24px]"
            } flex items-center gap-[8px] h-[24px] text-[14px] rounded-md transition-colors  ${
              selectedPracticeId && selectedPracticeId == p.id
                ? "font-bold"
                : "font-normal"
            } `}
            href={
              "/" +
              p.type.toLowerCase() +
              "?selectedPracticeId=" +
              p.id +
              `${selectedTaskId ? "&taskId=" + selectedTaskId : ""}`
            }
          >
            {selectedPracticeId === p.id && <SvgPlay className=" shrink-0 " />}
            {selectedPracticeId !== p.id &&
              (completedPractice.includes(p.id) ? (
                <SvgConfirmCheck className="mr-[4px]" />
              ) : (
                <SvgCheckSquare className="mr-[4px]" />
              ))}
            <span
              className={
                selectedPracticeId === p.id
                  ? "flex-1 line-clamp-1 text-[14px] text-[#F27059] font-normal"
                  : "flex-1 line-clamp-1 text-[14px] font-normal text-slate-600"
              }
            >
              {index + 1}. {p.name}
            </span>

            {completedPractice.includes(p.id) ? (
              <div className="flex items-center rounded-[24px] bg-[#F0FFFD] h-[33px] px-[16px] text-[12px] font-semibold text-[#0DAA94]">
                Completed
              </div>
            ) : !hasPaidPracticeAccess(
                user?.publicMetadata.plan as string | undefined,
                user?.publicMetadata.purchaseDate as string | undefined
              ) ? (
              p.isFree ? (
                <div className="flex shrink-0 bg-[#F0FFFD] rounded-[24px] text-[12px] justify-center items-center px-[16px] py-[8px]">
                  <span className="text-[12px] font-medium text-[#0DAA94]">
                    Free
                  </span>
                </div>
              ) : (
                <div className="flex shrink-0 justify-center items-center">
                  <SvgLock />
                </div>
              )
            ) : null}
          </a>
        ))}
      </div>
    </aside>
  );
};

export default ListeningSideMenu;
