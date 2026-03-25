import Headphones from "@mui/icons-material/Headphones";
import Mic from "@mui/icons-material/Mic";
import Draw from "@mui/icons-material/Draw";
import MenuBook from "@mui/icons-material/MenuBook";
import { useIsMobile } from "../../hooks/use-mobile";

type SectionColors = {
  bg: string;
  border: string;
  iconBg: string;
  indicator: string;
};

type SkillTabsProps = {
  activeSection: string;
  scrollToSection: (sectionRef: React.RefObject<HTMLDivElement>) => void;
  speakingRef: React.RefObject<HTMLDivElement>;
  writingRef: React.RefObject<HTMLDivElement>;
  readingRef: React.RefObject<HTMLDivElement>;
  listeningRef: React.RefObject<HTMLDivElement>;
  sectionColors: Record<string, SectionColors>;
  visibleTabs?: Record<string, boolean>;
};

const SkillTabs = ({
  activeSection,
  scrollToSection,
  speakingRef,
  writingRef,
  readingRef,
  listeningRef,
  sectionColors,
  visibleTabs = {
    speaking: true,
    writing: true,
    reading: true,
    listening: true,
  },
}: SkillTabsProps) => {
  const isMobile = useIsMobile();

  const skillIcons = {
    speaking: <Mic className="h-5 w-5" />,
    writing: <Draw className="h-5 w-5" />,
    reading: <MenuBook className="h-5 w-5" />,
    listening: <Headphones className="h-5 w-5" />,
  };

  const sections = [
    { id: "speaking", ref: speakingRef },
    { id: "writing", ref: writingRef },
    { id: "reading", ref: readingRef },
    { id: "listening", ref: listeningRef },
  ];

  return (
    <div className="flex justify-center gap-2 md:gap-6">
      {sections
        .filter(({ id }) => visibleTabs[id])
        .map(({ id, ref }) => (
          <button
            key={id}
            onClick={() => scrollToSection(ref)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all ${
              activeSection === id
                ? `${sectionColors[id].indicator} text-white`
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            aria-label={`Go to ${id} section`}
          >
            {!isMobile && (
              <span className="hidden sm:block capitalize text-[14px]">
                {id}
              </span>
            )}
            <div
              className={`${
                activeSection === id ? "text-white" : "text-gray-600"
              }`}
            >
              {skillIcons[id as keyof typeof skillIcons]}
            </div>
          </button>
        ))}
    </div>
  );
};

export default SkillTabs;
