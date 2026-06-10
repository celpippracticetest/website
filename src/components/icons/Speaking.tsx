import * as React from "react";
import type { SVGProps } from "react";
const SvgSpeaking = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 25 26"
    width={25}
    height={26}
    fill="none"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12.2 15.5c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4s-4 1.79-4 4v5.5c0 2.21 1.79 4 4 4"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4.55 9.65v1.7c0 4.22 3.43 7.65 7.65 7.65s7.65-3.43 7.65-7.65v-1.7M10.81 6.43c.9-.33 1.88-.33 2.78 0M11.4 8.55c.53-.14 1.08-.14 1.61 0M12.2 19v3"
    />
  </svg>
);
export default SvgSpeaking;
