
"use client"
import InsightsStateManager from "./insights/InsightsStateManager";
import InsightsHeader from "./insights/InsightsHeader";
import SkillsContainer from "./insights/SkillsContainer";
import { sectionColors, skillData } from "./insights/insightsData";

const AIInsightsSection = () => {
  return (
    <InsightsStateManager>
      {({ refs, state, actions }) => (
        <section ref={refs.sectionRef} className="py-12 md:py-16 bg-gray-50">
          <div className="cel-container">
            <InsightsHeader headerRef={refs.headerRef} />
            

            <SkillsContainer 
              refs={{
                speakingRef: refs.speakingRef,
                writingRef: refs.writingRef,
                readingRef: refs.readingRef,
                listeningRef: refs.listeningRef
              }}
              skillData={skillData}
              sectionColors={sectionColors}
            />
          </div>
        </section>
      )}
    </InsightsStateManager>
  );
};

export default AIInsightsSection;
