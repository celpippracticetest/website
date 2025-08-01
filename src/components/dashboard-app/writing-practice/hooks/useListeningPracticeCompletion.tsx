
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Custom hook to manage completion state of listening practices
 */
export const useListeningPracticeCompletion = () => {
  const { toast } = useToast();
  const [completedPractices, setCompletedPractices] = useState<Record<string, boolean>>({});
  
  const handlePracticeComplete = (practiceId: string) => {
    setCompletedPractices(prev => ({
      ...prev,
      [practiceId]: true
    }));
    
    toast({
      title: "Practice Completed!",
      description: "Great job completing this listening practice.",
      duration: 3000,
    });
  };
  
  return {
    completedPractices,
    handlePracticeComplete
  };
};
