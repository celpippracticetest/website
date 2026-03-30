import React from "react";
import People from "@mui/icons-material/People";

export interface StatBadgeProps {
  /**
   * The count or number to display (e.g., "1.8k", "2.5k")
   */
  count: string | number;
  
  /**
   * The label text to display (e.g., "answered today")
   */
  label: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * StatBadge - A simple component for displaying statistics with person icon
 * Simple design matching the image - light beige background with dark text
 * 
 * @example
 * ```tsx
 * <StatBadge 
 *   count="1.8k" 
 *   label="answered today" 
 * />
 * ```
 */
const StatBadge: React.FC<StatBadgeProps> = ({
  count,
  label,
  className = "",
}) => {
  return (
    <div
      className={`
        inline-flex items-center gap-1.5 sm:gap-2
        bg-white
        px-[8px] py-[5px] sm:px-[12px] sm:py-[8px] rounded-[6px] sm:rounded-[8px]
        border border-[#D5D6D8]
        ${className}
      `}
    >
      <People className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#212E42] flex-shrink-0" />
      
      <div className="flex items-baseline gap-0.5 sm:gap-1">
        <span className="text-[12px] font-semibold text-[#212E42] sm:text-[14px]">{count}</span>
        <span className="text-[10px] text-[#76808F] sm:text-[12px]">{label}</span>
      </div>
    </div>
  );
};

export default StatBadge;

