
import { Button } from "@/components/ui/button";
import { Mic, Pen, BookOpen, Headphones, BookCopy } from "lucide-react";
import { testimonialColors } from "./testimonialData";

type TestimonialType = "all" | "mock" | "speaking" | "writing" | "reading" | "listening";

interface TestimonialFilterProps {
  activeFilter: TestimonialType;
  setActiveFilter: (filter: TestimonialType) => void;
}

const TestimonialFilter = ({ activeFilter, setActiveFilter }: TestimonialFilterProps) => {
  const filters: { id: TestimonialType; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: <BookCopy className="h-4 w-4" /> },
    { id: "mock", label: "Mock Exams", icon: <BookCopy className="h-4 w-4" /> },
    { id: "speaking", label: "Speaking", icon: <Mic className="h-4 w-4" /> },
    { id: "writing", label: "Writing", icon: <Pen className="h-4 w-4" /> },
    { id: "reading", label: "Reading", icon: <BookOpen className="h-4 w-4" /> },
    { id: "listening", label: "Listening", icon: <Headphones className="h-4 w-4" /> }
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const bgColor = filter.id !== "all" 
          ? `${testimonialColors[filter.id as keyof typeof testimonialColors]}${isActive ? "" : "20"}`
          : isActive ? "#4B5563" : "#E5E7EB";
        
        return (
          <Button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`rounded-full text-xs font-medium py-1 px-3 h-auto hover:scale-105 transition-all`}
            style={{
              backgroundColor: isActive ? bgColor : "#F3F4F6",
              color: isActive ? (filter.id === "all" ? "white" : "white") : (filter.id === "all" ? "#4B5563" : testimonialColors[filter.id as keyof typeof testimonialColors]),
            }}
            variant="ghost"
            title={filter.label}
          >
            <span className="flex items-center gap-1">
              {filter.icon}
              <span className="hidden sm:inline">{filter.label}</span>
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default TestimonialFilter;
