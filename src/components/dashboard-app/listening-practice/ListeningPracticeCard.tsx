import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockOpen, Clock, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import PremiumBadge from "../PremiumBadge";
import { TPracticeDto } from "@/models/practice.model";
import SvgCircle from "@/components/icons/Circle";

interface ListeningPracticeCardProps {
  practice: TPracticeDto;
  isCompleted: boolean;
  onClick: () => void;
  isFree: boolean;
  onPremiumClick: () => void;
}

const ListeningPracticeCard = ({
  practice,
  isCompleted,
  onClick,
  isFree,
  onPremiumClick,
}: ListeningPracticeCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isFree) {
      onClick();
    } else {
      onPremiumClick();
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "advanced":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };
  const numberOfQuestions = practice.passages.reduce(
    (acc: number, passage: TPracticeDto["passages"][number]) => {
      return acc + passage?.questions?.length;
    },
    0
  );
  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer h-[110px] w-[290.5px] border",
        isCompleted
          ? "bg-green-50 bg-opacity-8"
          : isFree
          ? "bg-blue-50 bg-opacity-8"
          : "bg-gray-50 bg-opacity-8"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4 pt-3 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <h3 className="font-bold text-[14px] text-[#212121]">
              {practice.name}
            </h3>
          </div>

          {isCompleted ? (
            <Badge className="bg-[#4caf50]">
              <SvgCircle className=" mr-1" /> Completed
            </Badge>
          ) : isFree ? (
            <Badge className="bg-[#4caf50]">
              <LockOpen className="h-3 w-3 mr-1" /> Free
            </Badge>
          ) : (
            <PremiumBadge size="sm" />
          )}
        </div>

        <div className="flex items-center text-xs text-[#616161] mt-auto mb-1">
          <div className="flex items-center mr-3">
            {practice.passages.length} passage
            {practice.passages.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center mr-3">
            {numberOfQuestions} question{numberOfQuestions !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center mr-3">
            <Clock className="h-3 w-3 mr-1" /> {practice.duration}
          </div>
        </div>
        <div className="flex items-center text-xs text-[#616161] mt-auto mb-1">
          <div className="flex items-center">
            <Badge
              variant="outline"
              className={`${getDifficultyColor(
                practice.difficulty
              )} text-xs px-2 py-0 h-5`}
            >
              <BarChart2 className="h-3 w-3 mr-1" />{" "}
              {getDifficultyLabel(practice.difficulty)}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-3 pt-0">
        <Button
          className={cn(
            "w-full text-xs py-1 px-2",
            isFree
              ? "bg-[#4caf50] hover:bg-[#388e3c]"
              : "border-black text-black hover:bg-black hover:text-white"
          )}
          variant={isFree ? "default" : "outline"}
          onClick={handleClick}
          size="sm"
        >
          {isFree ? "Start Practice" : "Unlock Premium"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ListeningPracticeCard;
