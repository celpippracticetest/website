
import React from "react";
import Headphones from "@mui/icons-material/Headphones";
import Mic from "@mui/icons-material/Mic";
import Draw from "@mui/icons-material/Draw";
import MenuBook from "@mui/icons-material/MenuBook";
import SkillSection from "./SkillSection";
import { SkillDataMap } from "./skillTypes";

type SkillsContainerProps = {
  refs: {
    speakingRef: React.RefObject<HTMLDivElement>;
    writingRef: React.RefObject<HTMLDivElement>;
    readingRef: React.RefObject<HTMLDivElement>;
    listeningRef: React.RefObject<HTMLDivElement>;
  };
  skillData: SkillDataMap;
  sectionColors: any;
};

const SkillsContainer = ({ 
  refs,
  skillData,
  sectionColors 
}: SkillsContainerProps) => {
  const { speakingRef, writingRef, readingRef, listeningRef } = refs;

  const skillIcons = {
    speaking: <Mic className="h-6 w-6 text-pink-600" />,
    writing: <Draw className="h-6 w-6 text-blue-600" />,
    reading: <MenuBook className="h-6 w-6 text-violet-600" />,
    listening: <Headphones className="h-6 w-6 text-sky-600" />,
  };

  return (
    <div className="space-y-16 mt-6">
      <SkillSection
        id="speaking"
        sectionRef={speakingRef}
        bgColor={sectionColors.speaking.bg}
        gradientClasses="bg-gradient-to-r from-pink-200 to-pink-100"
        icon={skillIcons.speaking}
        iconBgColor={sectionColors.speaking.iconBg}
        title="Speaking Assessment"
        skillData={skillData.speaking}
      />

      <SkillSection
        id="writing"
        sectionRef={writingRef}
        bgColor={sectionColors.writing.bg}
        gradientClasses="bg-gradient-to-r from-blue-200 to-blue-100"
        icon={skillIcons.writing}
        iconBgColor={sectionColors.writing.iconBg}
        title="Writing Assessment"
        skillData={skillData.writing}
      />

      <SkillSection
        id="reading"
        sectionRef={readingRef}
        bgColor={sectionColors.reading.bg}
        gradientClasses="bg-gradient-to-r from-violet-200 to-violet-100"
        icon={skillIcons.reading}
        iconBgColor={sectionColors.reading.iconBg}
        title="Reading Assessment"
        skillData={skillData.reading}
      />

      <SkillSection
        id="listening"
        sectionRef={listeningRef}
        bgColor={sectionColors.listening.bg}
        gradientClasses="bg-gradient-to-r from-sky-200 to-sky-100"
        icon={skillIcons.listening}
        iconBgColor={sectionColors.listening.iconBg}
        title="Listening Assessment"
        skillData={skillData.listening}
      />
    </div>
  );
};

export default SkillsContainer;
