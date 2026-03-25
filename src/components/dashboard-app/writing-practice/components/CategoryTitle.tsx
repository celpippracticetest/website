
import { Button } from "@/components/ui/button";
import ChevronLeft from "@mui/icons-material/ChevronLeft";

interface CategoryTitleProps {
  title: string;
  onBackClick: () => void;
}

const CategoryTitle = ({ title, onBackClick }: CategoryTitleProps) => {
  return (
    <>
      <Button 
        variant="ghost" 
        className="flex items-center p-0 h-auto"
        onClick={onBackClick}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to categories
      </Button>
      
      <h3 className="text-xl font-semibold mb-4">{title} Practices</h3>
    </>
  );
};

export default CategoryTitle;
