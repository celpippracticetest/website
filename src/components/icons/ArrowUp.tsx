import * as React from "react";
import type { SVGProps } from "react";
const SvgArrowUp = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={25}
    fill="none"
    {...props}
  >
    <path
      fill="#526075"
      fillRule="evenodd"
      d="M10.098 9.718a2.254 2.254 0 0 1 3.181 0l4.94 4.94a.75.75 0 0 1-1.06 1.06l-4.94-4.94a.754.754 0 0 0-1.06 0l-4.94 4.94a.75.75 0 1 1-1.06-1.06z"
      clipRule="evenodd"
    />
  </svg>
);
export default SvgArrowUp;
