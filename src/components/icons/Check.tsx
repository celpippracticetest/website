import * as React from "react";
import type { SVGProps } from "react";
const SvgCheck = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <path
      fill="#0DAA94"
      fillRule="evenodd"
      d="M20.706 6.961a.75.75 0 0 1 0 1.061l-10.018 10a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 1 1 1.06-1.061l4.47 4.47 9.488-9.47a.75.75 0 0 1 1.06 0"
      clipRule="evenodd"
    />
  </svg>
);
export default SvgCheck;
