import * as React from "react";
import type { SVGProps } from "react";
const SvgOffer = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={33}
    height={32}
    fill="none"
    {...props}
  >
    <path
      stroke="#316BFF"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m12.093 20.36 8.72-8.72M12.64 13.827a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28M21.36 21.454a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28"
    />
    <path
      stroke="#316BFF"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M16.667 29.333C24.03 29.333 30 23.363 30 15.999S24.03 2.666 16.667 2.666 3.333 8.636 3.333 15.999s5.97 13.334 13.334 13.334"
    />
  </svg>
);
export default SvgOffer;
