import * as React from "react";
import type { SVGProps } from "react";
const SvgPlay = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      fill="#F27059"
      d="M16.833 9.134a1 1 0 0 1 0 1.732l-9.5 5.485a1 1 0 0 1-1.5-.866V4.515a1 1 0 0 1 1.5-.866z"
    />
  </svg>
);
export default SvgPlay;
