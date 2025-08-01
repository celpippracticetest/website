import * as React from "react";
import type { SVGProps } from "react";
const SvgListeningPart = (props: SVGProps<SVGSVGElement>) => (
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
      d="M5.274 5.876c.396-.89.744-1.933 1.611-2.475 4.086-2.554 8.316 1.44 7.695 5.786-.36 2.515-3.004 3.86-4.056 5.965-.902 1.803-4.457 3.493-4.743.924"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11.478 11.93c2.111-2.238 1.579-7.495-1.909-7.336-2.624.119-2.012 3.64-1.401 4.861"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M7.636 7.755c2.796-.194 3.747 2.75 1.933 4.563-.472.473-1.386-.214-1.933.06s-.957 1.136-1.497.507"
    />
  </svg>
);
export default SvgListeningPart;
