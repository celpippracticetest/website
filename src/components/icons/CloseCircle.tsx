import * as React from "react";
import type { SVGProps } from "react";
const SvgCloseCircle = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <path
      stroke="#F27059"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12.5 22c5.5 0 10-4.5 10-10S18 2 12.5 2s-10 4.5-10 10 4.5 10 10 10M9.67 14.83l5.66-5.66M15.33 14.83 9.67 9.17"
    />
  </svg>
);
export default SvgCloseCircle;
