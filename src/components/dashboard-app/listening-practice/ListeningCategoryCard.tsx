import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LockOpen from "@mui/icons-material/LockOpen";
import { ListeningCategory } from "./types/ListeningPractice";
import { cn } from "@/lib/utils";
import PremiumBadge from "../PremiumBadge";

interface ListeningCategoryCardProps {
  category: ListeningCategory;
  onClick: () => void;
  isFree: boolean;
}

const ListeningCategoryCard = ({
  category,
  onClick,
  isFree,
}: ListeningCategoryCardProps) => {
  const iconMap: Record<string, React.ReactNode> = {
    megaphone: <span className="text-2xl">📢</span>,
    conversation: <span className="text-2xl">💬</span>,
    lecture: <span className="text-2xl">🎓</span>,
    radio: <span className="text-2xl">📻</span>,
    interview: <span className="text-2xl">🎙️</span>,
    news: <span className="text-2xl">📰</span>,
  };

  return (
    <Card
      className={cn(
        "cursor-pointer border-0 rounded-xl overflow-hidden relative h-full",
        isFree ? "bg-white" : "bg-white"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col h-full bg-white">
        <div className="flex justify-between items-start mb-4">
          <div className="rounded-full bg-white p-2 flex items-center justify-center">
            {iconMap[category.icon] || <span className="text-2xl">🎧</span>}
          </div>

          {isFree ? (
            <Badge className="bg-[#4caf50]">
              <LockOpen className="h-3 w-3 mr-1" /> Free Access
            </Badge>
          ) : (
            <PremiumBadge size="sm" />
          )}
        </div>

        <h3 className="font-bold text-lg text-[#212121] mb-2">
          {category.title}
        </h3>
        <p className="text-[#424242] text-[14px]">{category.description}</p>

        <div className="mt-3 text-[14px] text-[#616161]">
          {category.practices.length} practice
          {category.practices.length !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  );
};

export default ListeningCategoryCard;
