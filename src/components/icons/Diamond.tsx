import * as React from "react";
import type { SVGProps } from "react";
const SvgDiamond = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <g clipPath="url(#diamond_svg__a)">
      <path fill="#95D5F1" d="m12 23.412 12-16.56L19.416.586H4.584L0 6.85z" />
      <path
        fill="#C9EFFF"
        d="M4.584.587 8 6.85H0zM19.416.587 16 6.85 12 .587zM16 6.852l-4 16.56-4-16.56z"
      />
      <path
        fill="#75BCDA"
        d="M19.417.587 24 6.85h-8zM12 .587l4 6.264H8zM8 6.852l4 16.56L0 6.852z"
      />
    </g>
    <defs>
      <clipPath id="diamond_svg__a">
        <path fill="#fff" d="M0 0h24v24H0z" />
      </clipPath>
    </defs>
  </svg>
);
export default SvgDiamond;
