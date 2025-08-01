import * as React from "react";
import type { SVGProps } from "react";
const SvgPractice = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8.375 2.108 3.358 5.383a2.655 2.655 0 0 0 0 4.45l5.017 3.275c.9.592 2.383.592 3.283 0l4.992-3.275c1.6-1.05 1.6-3.391 0-4.441l-4.992-3.275c-.9-.6-2.383-.6-3.283-.009"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m4.692 10.9-.009 3.908c0 1.059.817 2.192 1.817 2.525l2.658.884c.459.15 1.217.15 1.684 0l2.658-.884c1-.333 1.817-1.466 1.817-2.525v-3.866M17.833 12.5v-5"
    />
  </svg>
);
export default SvgPractice;
