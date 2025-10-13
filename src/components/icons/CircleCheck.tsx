import * as React from "react";
import type { SVGProps } from "react";
const SvgCircleCheck = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#979EA8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10 18.333c4.583 0 8.333-3.75 8.333-8.334S14.583 1.666 10 1.666s-8.333 3.75-8.333 8.333 3.75 8.334 8.333 8.334"
    />
    <path
      stroke="#979EA8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m6.458 10 2.359 2.36 4.725-4.717"
    />
  </svg>
);
export default SvgCircleCheck;
