import * as React from "react";
import type { SVGProps } from "react";
const SvgBeavo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    {...props}
  >
    <path
      fill="url(#beavo_svg__a)"
      d="m10.333 5.334 1.35 3.649 3.65 1.35-3.65 1.35-1.35 3.65-1.35-3.65-3.65-1.35 3.65-1.35z"
    />
    <path
      fill="url(#beavo_svg__b)"
      d="m6 1.334.9 2.433 2.433.9-2.433.9L6 8l-.9-2.433-2.433-.9 2.433-.9z"
    />
    <path
      fill="url(#beavo_svg__c)"
      d="m3.333 7.334.54 1.46 1.46.54-1.46.54-.54 1.46-.54-1.46-1.46-.54 1.46-.54z"
    />
    <defs>
      <linearGradient
        id="beavo_svg__a"
        x1={15.333}
        x2={5.333}
        y1={10.334}
        y2={10.334}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F79D65" />
        <stop offset={1} stopColor="#759CFF" />
      </linearGradient>
      <linearGradient
        id="beavo_svg__b"
        x1={9.333}
        x2={2.667}
        y1={4.667}
        y2={4.667}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F79D65" />
        <stop offset={1} stopColor="#759CFF" />
      </linearGradient>
      <linearGradient
        id="beavo_svg__c"
        x1={5.333}
        x2={1.333}
        y1={9.334}
        y2={9.334}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F79D65" />
        <stop offset={1} stopColor="#759CFF" />
      </linearGradient>
    </defs>
  </svg>
);
export default SvgBeavo;
