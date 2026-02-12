"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { trackPageView, setUserContext } from "@/lib/gtm";

/**
 * PageViewTracker Component
 * Automatically tracks page views on route changes
 * Enriches page views with user context (auth status, plan type)
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    // Update global user context for other events
    setUserContext({
      userId: user?.id,
      userPlan: (user?.publicMetadata?.plan as string) || "free",
      isAuthenticated: isSignedIn || false,
    });

    // Track page view on mount and route changes
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Small delay to allow document.title to update
    const timer = setTimeout(() => {
      const title = document.title;
      
      trackPageView(
        url,
        title,
        user?.id,
        (user?.publicMetadata?.plan as string) || "free"
      );

      // Optional: Log for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[PageView] Tracked:', {
          path: url,
          title,
          isSignedIn,
          userPlan: user?.publicMetadata?.plan || 'free'
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams, isSignedIn, user]);

  return null; // This component doesn't render anything
}
