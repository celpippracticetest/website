"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import useStore from "@/store";
import { useRouter } from "nextjs-toploader/app";

const FloatingButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCTAVisible, setIsCTAVisible] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();
  const ctaObserverRef = useRef<IntersectionObserver | null>(null);
  const setCurrentPage = useStore((state) => state.dashboard.setCurrentPage);

  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const heroSection = document.querySelector("main > section:first-child");

      if (!heroSection) {
        return;
      }

      const heroRect = heroSection.getBoundingClientRect();
      // When the bottom of the hero is above the viewport top, show the button
      const shouldShow = heroRect.bottom < 0;
      setIsVisible(shouldShow);
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile]);

  // Set up Intersection Observer for CTA section
  useEffect(() => {
    if (!isMobile) return;

    const ctaSection = document.querySelector("main > section:last-of-type");
    if (!ctaSection) {
      return;
    }

    const observerOptions = {
      root: null, // Use viewport as root
      threshold: 0.1, // Trigger when at least 10% of the target is visible
      rootMargin: "0px", // No margin
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        setIsCTAVisible(entry.isIntersecting);
      });
    };

    ctaObserverRef.current = new IntersectionObserver(
      observerCallback,
      observerOptions
    );
    ctaObserverRef.current.observe(ctaSection);

    return () => {
      if (ctaObserverRef.current) {
        ctaObserverRef.current.disconnect();
      }
    };
  }, [isMobile]);

  // Early return if not on mobile
  if (!isMobile) return null;

  // Determine final visibility - show only if we're past hero AND CTA is not visible
  const finalVisibility = isVisible && !isCTAVisible;

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-3/5 max-w-xs transition-all duration-300 ${
        finalVisibility
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-10 pointer-events-none"
      }`}
    >
      <div className="relative">
        <Button
          onClick={() => {
            setCurrentPage("practice");
            router.push("/practice-overview");
          }}
          className="w-full py-3 h-auto text-lg bg-[#3ebbf3] hover:bg-[#3ebbf3]/90 rounded-full text-white font-medium shadow-lg"
        >
          Try for free
        </Button>
      </div>
    </div>
  );
};

export default FloatingButton;
