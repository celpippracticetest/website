"use client";
import { Headphones, BookOpen, Pen, Mic, BookOpenCheck, Library } from "lucide-react";
import DesktopHeader from "./desktopHeader";
import MobileHeader from "./mobileHeader";
import { useState } from "react";
import useStore from "@/store";
import { useRouter } from 'nextjs-toploader/app';
import { useEventTracker } from "@/hooks/useTracking";


const Header = ({ viewMode, currentPage }: { viewMode: "practice" | "exams" | null; currentPage: string | null }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { trackNav } = useEventTracker();
  const setViewMode = useStore((state) => state.dashboard.setView);
  const setCurrentPage = useStore((state) => state.dashboard.setCurrentPage);
  const navLinks = [
    {
      name: "Mock Exams",
      mobileName: 'Exams',
      path: "/exams",
      icon: <BookOpenCheck className="w-5 h-5 text-orange-500" />,
      onClick: () => {
        trackNav("Mock Exams", "/exam-overview", "header");
        setViewMode("exams");
        setCurrentPage("exams");
        router.push("/exam-overview");
      },
    },
    {
      name: "Practice Overview",
      mobileName: 'Practice',
      path: "/practice-overview",
      icon: <Headphones className="w-5 h-5 text-blue-500" />,
      onClick: () => {
        trackNav("Practice Overview", "/practice-overview", "header");
        setViewMode("practice");
        setCurrentPage("practice-overview");
        router.push("/practice-overview");
      },
    },
    {
      name: "CELPIP Wiki",
      mobileName: 'Wiki',
      path: "/wiki",
      icon: <Library className="w-5 h-5 text-yellow-500" />,
      onClick: () => {
        trackNav("CELPIP Wiki", "/wiki", "header");
        router.push("/wiki");
      },
    },
  ];
  return (
    <nav className="flex flex-col fixed lg:top-4 top-0 border lg:rounded-2xl left-0 right-0 w-full lg:px-5 px-2 z-50 max-w-5xl mx-auto bg-white/70 backdrop-blur shadow-sm">
      
        <DesktopHeader
          navLinks={navLinks}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          viewMode={viewMode}
          currentPage={currentPage}
        />

        {/* Mobile menu */}
        <MobileHeader
          navLinks={navLinks}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          viewMode={viewMode}
          currentPage={currentPage}
        />
      
    </nav>
  );
};

export default Header;
