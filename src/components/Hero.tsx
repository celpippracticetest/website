"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import useStore from "@/store";
import { useRouter } from "nextjs-toploader/app";

const Hero = () => {
  const [displayText, setDisplayText] = useState("");
  const fullText = "Ace Your CELPIP Test with Confidence!";
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const router = useRouter();
  const setCurrentPage = useStore((state) => state.dashboard.setCurrentPage);
  useEffect(() => {
    if (displayText.length >= fullText.length) {
      setIsTypingComplete(true);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayText(fullText.substring(0, displayText.length + 1));
    }, 70); // Adjust this value for typing speed (70ms per character feels natural)

    return () => clearTimeout(timer);
  }, [displayText, fullText]);

  return (
    <section className="py-6 md:py-16 bg-gray-100/70">
      <div className="cel-container">
        <div className="md:flex items-start justify-between">
          <div className="md:w-7/12 mb-8 md:mb-12">
            {/* User avatars and testimonial */}
            <div className="flex items-center mb-5 md:mb-8 bg-white rounded-full py-2 px-4 w-fit shadow-sm">
              <div className="flex -space-x-3 mr-3">
                <img
                  src="/lovable-uploads/32.jpg"
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
                <img
                  src="/lovable-uploads/44.jpg"
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
                <img
                  src="/lovable-uploads/57.jpg"
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
                <img
                  src="/lovable-uploads/43.jpg"
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
              </div>
              <h2 className="text-gray-800 font-medium">
                Trusted by <span className="font-bold">70k+ test-takers</span>
              </h2>
            </div>

            {/* Main heading with character-by-character streaming effect */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-8 md:mb-10 min-h-24 md:min-h-32">
              {displayText.split(" ").map((word, index, array) => {
                // Check if the word is CELPIP to apply special styling
                if (word === "CELPIP") {
                  return (
                    <span key={index} className="text-[#3ebbf3] font-bold">
                      {word}
                      {index < array.length - 1 ? " " : ""}
                    </span>
                  );
                }

                // For all other words, make them slightly smaller (3 degrees down)
                return (
                  <span key={index} className="text-4xl md:text-6xl">
                    {word}
                    {index < array.length - 1 ? " " : ""}
                  </span>
                );
              })}
              {!isTypingComplete && (
                <span className="inline-block w-0.5 h-12 bg-gray-900 ml-1 animate-pulse">
                  |
                </span>
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                className="bg-[#3ebbf3] hover:bg-[#3ebbf3]/90 rounded-full text-white font-semibold text-lg px-8 py-3 h-auto shadow-md"
                onClick={() => {
                  setCurrentPage("practice");
                  router.push("/practice-overview");
                }}
              >
                Try for free <ArrowRight className="ml-2" />
              </Button>

              {/* Badge images */}
              <div className="flex items-center gap-3 flex-wrap">
                <img
                  src="/lovable-uploads/d2759636-afe6-4e6d-b91c-f17ca332d698.png"
                  alt="Top-Rated CELPIP Resource 2025"
                  className="h-10 object-contain"
                />
                <img
                  src="/lovable-uploads/86c2038b-4804-44f5-b544-b79a775e3768.png"
                  alt="Expert-Endorsed CELPIP Guide"
                  className="h-10 object-contain"
                />
              </div>
            </div>
          </div>

          <div className="md:w-5/12">
            <div className="space-y-5">
              {/* Feature boxes - removed hyperlinks but kept hover effects */}
              <div className="flex items-center bg-white rounded-lg p-4 shadow-sm hover:bg-[#3ebbf3] hover:text-white transition-all duration-300 cursor-pointer group">
                <img
                  src="/lovable-uploads/ed4fc376-ea1a-49a0-9a58-bd6f1601fcac.png"
                  alt="Sample tests"
                  className="w-8 h-8 mr-4 group-hover:brightness-0 group-hover:invert transition-all duration-300"
                />
                <span className="text-xl font-medium">2,000+ sample tests</span>
              </div>

              <div className="flex items-center bg-white rounded-lg p-4 shadow-sm hover:bg-[#3ebbf3] hover:text-white transition-all duration-300 cursor-pointer group">
                <img
                  src="/lovable-uploads/43e2871b-45e6-4e9c-9ab4-43ee92ee222c.png"
                  alt="Mock exams"
                  className="w-8 h-8 mr-4 group-hover:brightness-0 group-hover:invert transition-all duration-300"
                />
                <span className="text-xl font-medium">60 mock exams</span>
              </div>

              <div className="flex items-center bg-white rounded-lg p-4 shadow-sm hover:bg-[#3ebbf3] hover:text-white transition-all duration-300 cursor-pointer group">
                <img
                  src="/lovable-uploads/decabc78-d743-4323-804f-f2b64ec338ab.png"
                  alt="AI scoring"
                  className="w-8 h-8 mr-4 group-hover:brightness-0 group-hover:invert transition-all duration-300"
                />
                <span className="text-xl font-medium">AI-powered scoring</span>
              </div>

              <div className="flex items-center bg-white rounded-lg p-4 shadow-sm hover:bg-[#3ebbf3] hover:text-white transition-all duration-300 cursor-pointer group">
                <img
                  src="/lovable-uploads/3eedf08f-6dd7-43aa-a5d4-c70e98e8f17b.png"
                  alt="Guide and Tips"
                  className="w-8 h-8 mr-4 group-hover:brightness-0 group-hover:invert transition-all duration-300"
                />
                <span className="text-xl font-medium">Guide & Tips</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
