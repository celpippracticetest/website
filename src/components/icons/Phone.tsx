import * as React from "react";
import type { SVGProps } from "react";
const SvgPhone = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <path
      stroke="#76808F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 7v10c0 4-1 5-5 5H9c-4 0-5-1-5-5V7c0-4 1-5 5-5h6c4 0 5 1 5 5M14 5.5h-4"
    />
    <path
      stroke="#76808F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 19.1a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1"
    />
  </svg>
);
export default SvgPhone;
