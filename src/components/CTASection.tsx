"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "nextjs-toploader/app";

const CTASection = () => {
  const isMobile = useIsMobile();
  const router = useRouter();
  return (
    <section className="bg-gray-50 py-10 md:py-12">
      <div className="cel-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Column - Text & CTA */}
          <div className="space-y-4 md:space-y-5">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Ready to Boost Your Score?
            </h2>

            {/* Only show paragraph on tablet and desktop */}
            {!isMobile && (
              <p className="text-lg text-gray-700 leading-relaxed">
                Take the next step toward a standout score with our all-in-one
                platform. Whether you&apos;re perfecting your speaking or
                sharpening your writing, we&apos;ve got you covered.
              </p>
            )}

            {/* Only show button here on non-mobile */}
            {!isMobile && (
              <div className="pt-1">
                <Button
                  onClick={() => {
                    router.push("/practice-overview");
                  }}
                  className="bg-[#3ebbf3] hover:bg-[#3ebbf3]/90 rounded-full text-white font-semibold text-lg px-8 py-3 h-auto shadow-md"
                >
                  Start Your Free Practice
                  <ArrowRight className="ml-2" />
                </Button>
                <p className="text-[14px] text-gray-500 mt-2">
                  No credit card required
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Image */}
          <div className="rounded-lg overflow-hidden shadow-lg">
            <img
              src="/lovable-uploads/ef421efc-034b-4b92-8254-51be1de9aca8.png"
              alt="Student studying with books"
              className="w-full h-auto object-cover rounded-lg transform transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>

        {/* Mobile-only button placed below the image */}
        {isMobile && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => {
                router.push("/practice-overview");
              }}
              className="bg-[#3ebbf3] hover:bg-[#3ebbf3]/90 rounded-full text-white font-semibold text-lg px-8 py-3 h-auto shadow-md"
            >
              Start Your Free Practice
              <ArrowRight className="ml-2" />
            </Button>
            <p className="text-[14px] text-gray-500 mt-3">
              No credit card required
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CTASection;
