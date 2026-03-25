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
        inline-flex items-center gap-2
        bg-white
        px-[12px] py-[8px] rounded-[8px]
        border border-[#D5D6D8]
        ${className}
      `}
    >
      <People className="w-4 h-4 text-[#212E42] flex-shrink-0" />
      
      <div className="flex items-baseline gap-1">
        <span className="text-[14px] font-semibold text-[#212E42]">{count}</span>
        <span className="text-[12px] text-[#76808F]">{label}</span>
      </div>
    </div>
  );
};

export default StatBadge;

