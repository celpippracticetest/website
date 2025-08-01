
import React from "react";

type InsightsHeaderProps = {
  headerRef: React.RefObject<HTMLDivElement>;
};

const InsightsHeader = ({ headerRef }: InsightsHeaderProps) => {
  return (
    <div id="insights-header" ref={headerRef} className="pt-4 pb-6">
      <div className="text-center mb-4">
        <h2 className="text-3xl md:text-5xl font-bold mb-3 text-gray-800 animate-fade-in">
          Get Real-Time Insights on Your Responses
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto animate-fade-in">
          Our AI engine instantly evaluates your writing and speaking, highlighting strengths, pinpointing weaknesses, and offering practical tips for improvement.
        </p>
      </div>
    </div>
  );
};

export default InsightsHeader;
