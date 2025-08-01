import * as React from "react";
import type { SVGProps } from "react";
const SvgSpeakingPart = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10 12.917a3.33 3.33 0 0 0 3.333-3.334V5a3.332 3.332 0 1 0-6.666 0v4.583A3.33 3.33 0 0 0 10 12.917"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3.625 8.042v1.416A6.38 6.38 0 0 0 10 15.833a6.38 6.38 0 0 0 6.375-6.375V8.042M8.842 5.358a3.36 3.36 0 0 1 2.316 0M9.333 7.125c.442-.117.9-.117 1.342 0M10 15.833v2.5"
    />
  </svg>
);
export default SvgSpeakingPart;
