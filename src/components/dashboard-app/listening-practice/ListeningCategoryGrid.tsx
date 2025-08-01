
import { ListeningCategory } from "./types/ListeningPractice";
import ListeningCategoryCard from "./ListeningCategoryCard";

interface ListeningCategoryGridProps {
  categories: ListeningCategory[];
  onCategoryClick: (categoryId: string) => void;
  categoriesWithFreePractice: string[];
}

const ListeningCategoryGrid = ({ 
  categories, 
  onCategoryClick,
  categoriesWithFreePractice
}: ListeningCategoryGridProps) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center items-center">
      {categories.map((category) => (
        <ListeningCategoryCard 
          key={category.id}
          category={category}
          onClick={() => onCategoryClick(category.id)}
          isFree={categoriesWithFreePractice.includes(category.id)}
        />
      ))}
    </div>
  );
};

export default ListeningCategoryGrid;
