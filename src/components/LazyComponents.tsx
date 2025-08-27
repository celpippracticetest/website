"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load Intercom
export const LazyIntercom = dynamic(() => import("./IntercomLoader"), {
  loading: () => null,
  ssr: false,
});

// Generic loading component
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-32">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Lazy wrapper component
export const LazyWrapper = ({
  children,
  fallback = <LoadingSpinner />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => <Suspense fallback={fallback}>{children}</Suspense>;
