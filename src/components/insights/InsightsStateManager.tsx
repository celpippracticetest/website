
import { useState, useRef, useEffect } from "react";

type InsightsStateManagerProps = {
  children: (props: {
    refs: {
      speakingRef: React.RefObject<HTMLDivElement>;
      writingRef: React.RefObject<HTMLDivElement>;
      readingRef: React.RefObject<HTMLDivElement>;
      listeningRef: React.RefObject<HTMLDivElement>;
      sectionRef: React.RefObject<HTMLDivElement>;
      headerRef: React.RefObject<HTMLDivElement>;
    };
    state: {
      activeSection: string;
      isSticky: boolean;
      sectionHeights: Record<string, number>;
    };
    actions: {
      scrollToSection: (sectionRef: React.RefObject<HTMLDivElement>) => void;
    };
  }) => React.ReactNode;
};

const InsightsStateManager = ({ children }: InsightsStateManagerProps) => {
  const speakingRef = useRef<HTMLDivElement>(null);
  const writingRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const listeningRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  const [activeSection, setActiveSection] = useState<string>("speaking");
  const [isSticky, setIsSticky] = useState(false);
  const [sectionHeights, setSectionHeights] = useState<Record<string, number>>({
    speaking: 0,
    writing: 0,
    reading: 0,
    listening: 0
  });

  // Calculate and store section heights
  useEffect(() => {
    const updateSectionHeights = () => {
      setSectionHeights({
        speaking: speakingRef.current?.offsetHeight || 0,
        writing: writingRef.current?.offsetHeight || 0,
        reading: readingRef.current?.offsetHeight || 0,
        listening: listeningRef.current?.offsetHeight || 0
      });
    };

    // Initial calculation
    updateSectionHeights();
    
    // Recalculate on resize
    window.addEventListener('resize', updateSectionHeights);
    
    // Recalculate after a short delay to ensure DOM is fully rendered
    const timeout = setTimeout(updateSectionHeights, 500);
    
    return () => {
      window.removeEventListener('resize', updateSectionHeights);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.6,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, options);

    if (speakingRef.current) observer.observe(speakingRef.current);
    if (writingRef.current) observer.observe(writingRef.current);
    if (readingRef.current) observer.observe(readingRef.current);
    if (listeningRef.current) observer.observe(listeningRef.current);

    return () => {
      if (speakingRef.current) observer.unobserve(speakingRef.current);
      if (writingRef.current) observer.unobserve(writingRef.current);
      if (readingRef.current) observer.unobserve(readingRef.current);
      if (listeningRef.current) observer.unobserve(listeningRef.current);
    };
  }, []);

  useEffect(() => {
    const stickyObserver = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-40px 0px 0px 0px" }
    );
    
    if (headerRef.current) {
      stickyObserver.observe(headerRef.current);
    }

    return () => {
      if (headerRef.current) {
        stickyObserver.unobserve(headerRef.current);
      }
    };
  }, []);

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return children({
    refs: {
      speakingRef,
      writingRef,
      readingRef,
      listeningRef,
      sectionRef,
      headerRef
    },
    state: {
      activeSection,
      isSticky,
      sectionHeights
    },
    actions: {
      scrollToSection
    }
  });
};

export default InsightsStateManager;
