import * as React from "react";
import type { SVGProps } from "react";
const SvgSvgBeforeTypingWord = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={40}
    height={40}
    fill="none"
    {...props}
  >
    <rect width={39} height={39} x={0.5} y={0.5} stroke="#D5D6D8" rx={19.5} />
    <path
      stroke="#292D32"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11 16.25v7.5M15.5 13.75v12.5M20 11.25v17.5M24.5 13.75v12.5M29 16.25v7.5"
    />
  </svg>
);
export default SvgSvgBeforeTypingWord;
