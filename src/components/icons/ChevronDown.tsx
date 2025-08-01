import * as React from "react";
import type { SVGProps } from "react";
const SvgChevronDown = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M10 12.917a.83.83 0 0 1-.59-.245L6.078 9.34a.832.832 0 1 1 1.179-1.178l2.754 2.754 2.744-2.65a.834.834 0 0 1 1.159 1.2l-3.334 3.217a.83.83 0 0 1-.579.235"
      clipRule="evenodd"
    />
  </svg>
);
export default SvgChevronDown;
