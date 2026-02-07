"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { trackPageView } from "@/lib/gtm";

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
    // Track page view on mount and route changes
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Get page title (may need to wait for document to update)
    const title = document.title;

    // Track the page view
    trackPageView(url, title);

    // Optional: Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[PageView] Tracked:', {
        path: url,
        title,
        isSignedIn,
        userPlan: user?.publicMetadata?.plan || 'free'
      });
    }
  }, [pathname, searchParams, isSignedIn, user]);

  return null; // This component doesn't render anything
}
