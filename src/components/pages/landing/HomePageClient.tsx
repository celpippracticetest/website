"use client";

import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import dynamic from "next/dynamic";
import { useChunkErrorHandler } from "@/hooks/useChunkErrorHandler";

const Hero = dynamic(() => import("./Hero"), { ssr: true });
const Practice = dynamic(() => import("./Practice"), { ssr: false });
const Comments = dynamic(() => import("./Comments"), { ssr: false });
const UserResponseReview = dynamic(() => import("./UserResponseReview"), {
  ssr: false,
});
const Footer = dynamic(() => import("./Footer"), { ssr: true });
const AskBeavoButton = dynamic(() => import("../../AskBeavo/AskBeavoButton"), {
  ssr: false,
});

function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f7ff] text-center">
      <h1 className="text-2xl font-semibold text-red-600 mb-4">
        Failed to Load Content
      </h1>
      <p className="mb-4">
        Something went wrong while loading part of the application.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Retry
      </button>
    </div>
  );
}

export default function HomePageClient() {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Intercom) {
      (window as any).Intercom("show");
    }
    return () => {
      if (typeof window !== "undefined" && (window as any).Intercom) {
        (window as any).Intercom("hide");
      }
    };
  }, []);

  const shouldReload = useChunkErrorHandler();
  if (shouldReload) return null;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="bg-[#F4F7FF]">
        <Hero />
        <UserResponseReview />
        <Comments />
        <Practice />
        <Practice />
        <Footer />
        <AskBeavoButton />
      </div>
    </ErrorBoundary>
  );
}
