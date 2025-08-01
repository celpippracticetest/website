import * as React from "react";
import type { SVGProps } from "react";
const SvgPerson = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={32}
    height={32}
    fill="none"
    {...props}
  >
    <path
      stroke="#F27059"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M16 16a6.667 6.667 0 1 0 0-13.334A6.667 6.667 0 0 0 16 16M4.547 29.333C4.547 24.173 9.68 20 16 20c1.28 0 2.52.173 3.68.493"
    />
    <path
      stroke="#F27059"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
      d="M29.333 24c0 1-.28 1.946-.773 2.746-.28.48-.64.907-1.053 1.253A5.2 5.2 0 0 1 24 29.333a5.29 5.29 0 0 1-4.56-2.587 5.23 5.23 0 0 1-.773-2.747c0-1.68.773-3.186 2-4.16A5.332 5.332 0 0 1 29.334 24"
    />
    <path
      stroke="#F27059"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m21.92 24 1.32 1.32 2.84-2.627"
    />
  </svg>
);
export default SvgPerson;
