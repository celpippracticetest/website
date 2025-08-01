import * as React from "react";
import type { SVGProps } from "react";
const SvgScoring = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M12 7v4"
    />
    <circle cx={8} cy={16} r={1} fill="#000" />
    <circle cx={16} cy={16} r={1} fill="#000" />
  </svg>
);
export default SvgScoring;
