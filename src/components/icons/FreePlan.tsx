import * as React from "react";
import type { SVGProps } from "react";
const SvgFreePlan = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={25}
    fill="none"
    {...props}
  >
    <path
      fill="#4A7DFF"
      d="m12 3 2.43 6.57L21 12l-6.57 2.43L12 21l-2.43-6.57L3 12l6.57-2.43z"
    />
  </svg>
);
export default SvgFreePlan;
