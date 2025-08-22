import * as React from "react";
import type { SVGProps } from "react";
const SvgInfo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#37465C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10 1.667c-4.583 0-8.333 3.75-8.333 8.334s3.75 8.333 8.333 8.333 8.333-3.75 8.333-8.333S14.583 1.667 10 1.667M10 13.334V9.167"
    />
    <path
      stroke="#37465C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.005 6.666h-.008"
    />
  </svg>
);
export default SvgInfo;
