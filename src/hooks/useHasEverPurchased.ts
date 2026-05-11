import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";

export const useHasEverPurchased = () => {
  const { user, isLoaded: userLoaded } = useHybridWebUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const [hasEverPurchased, setHasEverPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkPurchaseHistory = async () => {
      if (!userLoaded || !authLoaded || !user?.id) {
        if (!cancelled) {
          setHasEverPurchased(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const token = await getToken();
        const url = new URL(
          "/api/users/has-ever-purchased",
          window.location.origin,
        ).toString();

        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (cancelled) return;

        if (response.ok) {
          const data = (await response.json()) as { hasEverPurchased?: boolean };
          setHasEverPurchased(Boolean(data.hasEverPurchased));
        } else {
          setHasEverPurchased(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error checking purchase history:", error);
          setHasEverPurchased(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void checkPurchaseHistory();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userLoaded, authLoaded, getToken]);

  return { hasEverPurchased, isLoading };
};
