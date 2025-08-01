import { cn } from "@/lib/utils";

interface SkillProgressProps {
  label: string;
  score: number;
  maxScore: number;
}

const CircularSkillProgress = ({
  label,
  score,
  maxScore,
}: SkillProgressProps) => {
  const percentage = (score / maxScore) * 100;
  const scoreColor = () => {
    if (percentage >= 66.7) return "text-green-500"; // High score (8+ out of 12)
    if (percentage >= 50) return "text-yellow-500"; // Medium score (6-8 out of 12)
    if (percentage >= 33.3) return "text-orange-500"; // Low-medium score (4-6 out of 12)
    return "text-red-500"; // Low score (0-4 out of 12)
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-18 h-18 mb-2">
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>

        {/* Progress circle with color based on score */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle
            className="text-gray-100 stroke-current"
            strokeWidth="8"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
          />

          <circle
            className={cn(
              "stroke-current transition-all duration-500 ease-in-out",
              scoreColor()
            )}
            strokeWidth="8"
            strokeLinecap="round"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
            transform="rotate(-90 50 50)"
          />
        </svg>

        {/* Score text with fraction */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-xl font-bold", scoreColor())}>{score}</span>
          <span className="text-xs text-gray-500">/{maxScore}</span>
        </div>
      </div>
      <p className="text-[12px] screen744:!text-[14px] font-normal text-[#37465C]">
        {label}
      </p>
    </div>
  );
};

export default CircularSkillProgress;
