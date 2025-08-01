
import { ListeningCategory } from "./types/ListeningPractice";
import CategoryTitle from "./components/CategoryTitle";
import PracticeGrid from "./components/PracticeGrid";

interface ListeningPracticeListProps {
  category: ListeningCategory;
  onBackClick: () => void;
  onPracticeSelect: (practiceId: string) => void;
  onUpgrade: () => void;
  completedPractices: Record<string, boolean>;
  categoriesWithFreePractice: string[];
}

const ListeningPracticeList = ({
  category,
  onBackClick,
  onPracticeSelect,
  onUpgrade,
  completedPractices,
  categoriesWithFreePractice
}: ListeningPracticeListProps) => {
  const isFreeCategory = categoriesWithFreePractice.includes(category.id);
  
  return (
    <div className="space-y-6">
      <CategoryTitle 
        title={category.title}
        onBackClick={onBackClick}
      />
      
      <div>
        <PracticeGrid
          practices={category.practices}
          onPracticeSelect={onPracticeSelect}
          onUpgrade={onUpgrade}
          completedPractices={completedPractices}
          isFreeCategory={isFreeCategory}
        />
      </div>
    </div>
  );
};

export default ListeningPracticeList;
