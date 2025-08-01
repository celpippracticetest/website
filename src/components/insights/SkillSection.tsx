
import { ReactNode, useEffect, useState } from "react";
import SkillDetails from "./SkillDetails";
import AIFeedback from "./AIFeedback";
import SectionHeader from "./SectionHeader";
import { SkillData } from "./skillTypes";

type SkillSectionProps = {
  id: string;
  sectionRef: React.RefObject<HTMLDivElement>;
  bgColor: string;
  gradientClasses: string;
  icon: ReactNode;
  iconBgColor: string;
  title: string;
  skillData: SkillData;
};

const SkillSection = ({
  id,
  sectionRef,
  bgColor,
  gradientClasses,
  icon,
  iconBgColor,
  title,
  skillData,
}: SkillSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the section becomes 10% visible, trigger the animation
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Stop observing once visible
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the section is visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [sectionRef]);

  return (
    <div 
      id={id} 
      ref={sectionRef} 
      className={`rounded-lg shadow-sm overflow-hidden transition-all duration-700 ${bgColor} ${
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-10"
      }`}
    >
      <div className={`${gradientClasses} h-2`}></div>
      <div className="p-6">
        <SectionHeader 
          title={title} 
          icon={icon} 
          iconBgColor={iconBgColor} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <SkillDetails activeTab={id} skillData={skillData} />
          <AIFeedback feedback={skillData.feedback} focusAreas={skillData.focusAreas} />
        </div>
      </div>
    </div>
  );
};

export default SkillSection;
