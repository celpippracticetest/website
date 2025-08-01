import * as React from "react";
import type { SVGProps } from "react";
const SvgCheckSquare = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#D5D6D8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M7.5 18.333h5c4.166 0 5.833-1.666 5.833-5.833v-5c0-4.167-1.667-5.833-5.834-5.833h-5c-4.166 0-5.833 1.666-5.833 5.833v5c0 4.166 1.667 5.833 5.833 5.833"
    />
  </svg>
);
export default SvgCheckSquare;
