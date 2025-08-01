
import { listeningCategories, allListeningPractices } from "./data";

interface ListeningPracticeNavigationProps {
  selectedCategory: string | null;
  setSelectedCategory: (categoryId: string | null) => void;
  selectedPracticeId: string | null;
  setSelectedPracticeId: (practiceId: string | null) => void;
  updateUrlWithParams: (paramsToAdd: Record<string, string>, paramsToRemove?: string[]) => void;
  onUpgrade: () => void;
  categoriesWithFreePractice: string[];
}

const ListeningPracticeNavigation = ({
  selectedCategory,
  setSelectedCategory,
  selectedPracticeId,
  setSelectedPracticeId,
  updateUrlWithParams,
  onUpgrade,
  categoriesWithFreePractice
}: ListeningPracticeNavigationProps) => {
  
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPracticeId(null);
    
    // Update URL with category parameter
    updateUrlWithParams({ category: categoryId }, ['practice']);
  };
  
  const handlePracticeSelect = (practiceId: string) => {
    // Find the practice in all practices
    const practice = allListeningPractices.find(p => p.id === practiceId);
    
    if (!practice) return;
    
    // All practices are free
    setSelectedPracticeId(practiceId);
    
    // Update URL with practice parameter
    updateUrlWithParams({ practice: practiceId });
  };
  
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedPracticeId(null);
    
    // Update URL to remove category and practice parameters
    updateUrlWithParams({}, ['category', 'practice']);
  };
  
  const handleBackToPracticeList = () => {
    setSelectedPracticeId(null);
    
    // Update URL to remove practice parameter
    updateUrlWithParams({}, ['practice']);
  };
  
  const handleNavigateToNextPractice = (currentPracticeId: string) => {
    const currentCategory = selectedCategory 
      ? listeningCategories.find(cat => cat.id === selectedCategory)
      : null;
      
    if (!currentCategory) return;
    
    const currentPracticeIndex = currentCategory.practices.findIndex(p => p.id === currentPracticeId);
    
    if (currentPracticeIndex === -1 || currentPracticeIndex >= currentCategory.practices.length - 1) {
      return; // No next practice available
    }
    
    const nextPractice = currentCategory.practices[currentPracticeIndex + 1];
    
    // All practices are free
    setSelectedPracticeId(nextPractice.id);
    updateUrlWithParams({ practice: nextPractice.id });
  };
  
  // Always handle categories directly without premium check
  const handleCategoryClick = handleCategorySelect;
  
  return {
    handleCategoryClick,
    handlePracticeSelect,
    handleBackToCategories,
    handleBackToPracticeList,
    handleNavigateToNextPractice
  };
};

export default ListeningPracticeNavigation;
