"use client";
import { Headphones, BookOpenCheck, GraduationCap, BookA } from "lucide-react";
import DesktopHeader from "./desktopHeader";
import MobileHeader from "./mobileHeader";
import { useState } from "react";
import useStore from "@/store";
import { useRouter } from "nextjs-toploader/app";

const Header = ({
  viewMode,
  currentPage,
}: {
  viewMode: "practice" | "exams" | null;
  currentPage: string | null;
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const setViewMode = useStore((state) => state.dashboard.setView);
  const setCurrentPage = useStore((state) => state.dashboard.setCurrentPage);
  const navLinks = [
    {
      name: "Practice",
      mobileName: "Practice",
      path: "/practice-overview",
      icon: <Headphones className="w-5 h-5 text-blue-500" />,
      onClick: () => {
        setViewMode("practice");
        setCurrentPage("practice-overview");
        router.push("/practice-overview");
      },
    },
    {
      name: "Mock Exams",
      mobileName: "Mock Exams",
      path: "/exams",
      icon: <BookOpenCheck className="w-5 h-5 text-orange-500" />,
      onClick: () => {
        setViewMode("exams");
        setCurrentPage("exams");
        router.push("/exam-overview");
      },
    },
    {
      name: "Learning",
      mobileName: "Learning",
      path: "/learning",
      icon: <GraduationCap className="w-5 h-5 text-yellow-500" />,
      onClick: () => {
        router.push("/learning");
      },
    },
    {
      name: "Words",
      mobileName: "Words",
      path: "/words",
      icon: <BookA className="w-5 h-5 text-green-500" />,
      onClick: () => {
        router.push("/words");
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
