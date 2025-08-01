
import { useMemo } from "react";

interface WikiBannerProps {
  title: string;
  color?: string;
}

const WikiBanner = ({ title, color }: WikiBannerProps) => {
  // Default color is blue if none provided
  const gradientStyle = useMemo(() => {
    if (!color) {
      // Default blue gradient
      return {
        background: "linear-gradient(90deg, #3ebbf3, #2a80f1, #1a60e0)"
      };
    }
    
    // Create a gradient based on the provided color
    return {
      background: `linear-gradient(90deg, ${color}, ${color}dd, ${color}aa)`
    };
  }, [color]);

  return (
    <div 
      className="w-full py-10 flex items-center justify-center text-white"
      style={gradientStyle}
    >
      <h1 className="text-3xl md:text-4xl font-bold text-center max-w-4xl px-4">
        {title}
      </h1>
    </div>
  );
};

export default WikiBanner;
