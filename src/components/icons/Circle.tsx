import { cn } from "@/lib/utils";
import * as React from "react";
import type { SVGProps } from "react";
const SvgCircle = ({ className, style, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    className={cn("shrink-0 text-[14px] w-6 h-6", className)}
    style={{ ...style, fontSize: "14px", width: 24, height: 24 }}
    {...props}
  >
    <path
      stroke="#292D32"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10"
    />
  </svg>
);
export default SvgCircle;
