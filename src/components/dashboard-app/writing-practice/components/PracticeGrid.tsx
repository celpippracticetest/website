
import { ListeningPracticeItem } from "../types/ListeningPractice";
import ListeningPracticeCard from "../ListeningPracticeCard";

interface PracticeGridProps {
  practices: ListeningPracticeItem[];
  onPracticeSelect: (practiceId: string) => void;
  onUpgrade: () => void;
  completedPractices: Record<string, boolean>;
  isFreeCategory: boolean;
}

const PracticeGrid = ({ 
  practices, 
  onPracticeSelect, 
  onUpgrade,
  completedPractices,
  isFreeCategory
}: PracticeGridProps) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center items-center">
      {practices.map((practice, index) => {
        // All practices are free now
        const isFree = true;
        
        return (
          <ListeningPracticeCard
            key={practice.id}
            practice={practice}
            isCompleted={!!completedPractices[practice.id]}
            onClick={() => onPracticeSelect(practice.id)}
            isFree={isFree}
            onPremiumClick={onUpgrade}
          />
        );
      })}
    </div>
  );
};

export default PracticeGrid;
