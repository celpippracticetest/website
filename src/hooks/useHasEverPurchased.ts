import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export const useHasEverPurchased = () => {
  const { user, isLoaded } = useUser();
  const [hasEverPurchased, setHasEverPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPurchaseHistory = async () => {
      if (!isLoaded || !user) {
        setHasEverPurchased(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/users/has-ever-purchased");
        if (response.ok) {
          const data = await response.json();
          setHasEverPurchased(data.hasEverPurchased);
        } else {
          setHasEverPurchased(false);
        }
      } catch (error) {
        console.error("Error checking purchase history:", error);
        setHasEverPurchased(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPurchaseHistory();
  }, [user, isLoaded]);

  return { hasEverPurchased, isLoading };
};
