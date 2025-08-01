import * as React from "react";
import type { SVGProps } from "react";
const SvgLock = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#76808F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M5 8.333V6.667c0-2.759.833-5 5-5s5 2.241 5 5v1.666M10 15.417a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167"
    />
    <path
      stroke="#76808F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M14.167 18.334H5.833c-3.333 0-4.166-.834-4.166-4.167V12.5c0-3.333.833-4.166 4.166-4.166h8.334c3.333 0 4.166.833 4.166 4.166v1.667c0 3.333-.833 4.167-4.166 4.167"
    />
  </svg>
);
export default SvgLock;
