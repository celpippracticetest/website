import * as React from "react";
import type { SVGProps } from "react";
const SvgLearningArrowUp = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
      d="M18.07 9.57 12 3.5 5.93 9.57M12 20.5V3.67"
    />
  </svg>
);
export default SvgLearningArrowUp;
