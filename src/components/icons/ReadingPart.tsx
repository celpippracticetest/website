import * as React from "react";
import type { SVGProps } from "react";
const SvgReadingPart = (props: SVGProps<SVGSVGElement>) => (
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
      d="M18.333 13.95V3.892c0-1-.816-1.742-1.808-1.659h-.05c-1.75.15-4.408 1.042-5.892 1.975l-.141.092a.92.92 0 0 1-.884 0l-.208-.125c-1.483-.925-4.133-1.808-5.883-1.95a1.64 1.64 0 0 0-1.8 1.658V13.95c0 .8.65 1.55 1.45 1.65l.241.033c1.809.242 4.6 1.159 6.2 2.034l.034.016c.225.125.583.125.8 0 1.6-.883 4.4-1.808 6.216-2.05l.275-.033c.8-.1 1.45-.85 1.45-1.65M10 4.575v12.5M6.458 7.075H4.583M7.083 9.575h-2.5"
    />
  </svg>
);
export default SvgReadingPart;
