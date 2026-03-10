"use client";

import { ErrorBoundary } from "react-error-boundary";
import dynamic from "next/dynamic";
import Practice from "./Practice";
import FAQ from "./FAQ";
import { useChunkErrorHandler } from "@/hooks/useChunkErrorHandler";
import OnlineUsersCount from "@/components/analytics/OnlineUsersCount";

const Hero = dynamic(() => import("./Hero"), { ssr: true });
const Comments = dynamic(() => import("./Comments"), { ssr: false });
const UserResponseReview = dynamic(() => import("./UserResponseReview"), {
  ssr: false,
});
const FloatingChatIcon = dynamic(
  () => import("../../AskBeavo/FloatingChatIcon"),
  {
    ssr: false,
  },
);

type HomePageClientProps = {
  heroImage: {
    imageUrl: string;
    altText: string;
  };
};

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
        className="px-4 py-2 bg-blue-500 text-white rounded">
        Retry
      </button>
    </div>
  );
}

export default function HomePageClient({ heroImage }: HomePageClientProps) {
  const shouldReload = useChunkErrorHandler();
  if (shouldReload) return null;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="bg-[#F4F7FF]">
        <Hero heroImage={heroImage} />
        <UserResponseReview />
        <div className="flex flex-col mt-[40px] screen744:!mt-[80px] screen1280:!mt-[104px] max-w-[1440px] mx-auto justify-center w-full">
          <div className="flex justify-center px-[16px]">
            <div className="max-w-[1160px] w-full">
              <OnlineUsersCount variant="marketing" className="w-full" />
            </div>
          </div>
        </div>
        <Comments />
        <Practice />
        {/* <Blog /> */}
        <FAQ />
        <FloatingChatIcon autoOpen={false} />
      </div>
    </ErrorBoundary>
  );
}
