import * as React from "react";
import type { SVGProps } from "react";
const SvgMockTestNavigation = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={28}
    height={28}
    fill={props.fill || "none"}
    {...props}
  >
    <path
      stroke={props.stroke || "currentColor"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M14.432 10.36h6.125M7.443 10.36l.875.875 2.625-2.625M14.432 18.527h6.125M7.443 18.527l.875.875 2.625-2.625"
    />
    <path
      stroke={props.stroke || "currentColor"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10.5 25.667h7c5.833 0 8.167-2.334 8.167-8.167v-7c0-5.833-2.334-8.166-8.167-8.166h-7c-5.833 0-8.167 2.333-8.167 8.166v7c0 5.834 2.334 8.167 8.167 8.167"
    />
  </svg>
);
export default SvgMockTestNavigation;
