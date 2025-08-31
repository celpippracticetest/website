import * as React from "react";
import type { SVGProps } from "react";
const SvgLearning = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill={props.fill}
    {...props}
  >
    <path
      stroke={props.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
      d="M5.075 11.067H7.65v6c0 1.4.758 1.683 1.683.633l6.309-7.167c.775-.875.45-1.6-.725-1.6h-2.575v-6c0-1.4-.759-1.683-1.684-.633L4.35 9.467c-.767.883-.442 1.6.725 1.6"
    />
  </svg>
);
export default SvgLearning;
