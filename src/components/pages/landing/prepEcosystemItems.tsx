import SvgListening from "../../icons/Listening";
import SvgSpeaking from "../../icons/Speaking";
import SvgWriting from "../../icons/Writing";
import SvgReading from "../../icons/Reading";
import SvgMockExamsColorful from "../../icons/MockExamsColorful";
import { SvgLearning } from "../../icons";
import SvgWord from "../../icons/Word";

/** Shared tiles for style 1 & 2 homepage heroes (not legacy ExamSectionCard). */
export const prepEcosystemItems = [
  {
    title: "Listening",
    icon: <SvgListening className="text-primary1" />,
    bgColor: "bg-primary5",
    link: "/listening",
  },
  {
    title: "Speaking",
    icon: <SvgSpeaking className="text-secondary2" />,
    bgColor: "bg-secondary5",
    link: "/speaking",
  },
  {
    title: "Writing",
    icon: <SvgWriting className="text-success" />,
    bgColor: "bg-success5",
    link: "/writing",
  },
  {
    title: "Reading",
    icon: <SvgReading className="text-error1" />,
    bgColor: "bg-error5",
    link: "/reading",
  },
  {
    title: "Mock Exams",
    icon: (
      <SvgMockExamsColorful className="text-[#DA2AFE]" aria-hidden={true} />
    ),
    bgColor: "bg-purple5",
    link: "/exam-overview",
  },
  {
    title: "Learning",
    icon: <SvgLearning className="text-[#854D0E]" />,
    bgColor: "bg-[#FEF9C3]",
    link: "/learning",
  },
  {
    title: "Words",
    icon: <SvgWord className="text-[#0D8A72]" />,
    bgColor: "bg-[#CCFBF1]",
    link: "/words",
  },
] as const;
