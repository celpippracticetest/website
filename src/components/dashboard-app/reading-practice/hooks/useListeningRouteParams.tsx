
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { allListeningPractices } from "../data";

/**
 * Custom hook to handle URL parameters for listening practice navigation
 */
export const useListeningRouteParams = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);
  
  // Check URL for practice parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const practiceParam = params.get('practice');
    
    if (practiceParam) {
      const validPractice = allListeningPractices.find(p => p.id === practiceParam);
      if (validPractice) {
        setSelectedPracticeId(practiceParam);
      }
    } else {
      // Reset selected practice if no practice param in URL
      setSelectedPracticeId(null);
    }
    
    // Make sure 'page' parameter is always 'listening'
    const pageParam = params.get('page');
    if (pageParam !== 'listening') {
      const newParams = new URLSearchParams(location.search);
      newParams.set('page', 'listening');
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    }
  }, [location.search, navigate]);
  
  // Helper function to update URL parameters
  const updateUrlWithParams = (
    paramsToAdd: Record<string, string> = {}, 
    paramsToRemove: string[] = []
  ) => {
    const params = new URLSearchParams(location.search);
    
    // Add or update parameters
    Object.entries(paramsToAdd).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    // Remove parameters
    paramsToRemove.forEach(param => {
      params.delete(param);
    });
    
    // Always ensure 'page' parameter is 'listening'
    params.set('page', 'listening');
    
    // Update URL without reloading the page
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };
  
  return {
    selectedCategory,
    setSelectedCategory,
    selectedPracticeId,
    setSelectedPracticeId,
    updateUrlWithParams
  };
};
