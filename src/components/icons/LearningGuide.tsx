import * as React from "react";
import type { SVGProps } from "react";
const SvgLearningGuide = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={21}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#759CFF"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m18.217 8.7-.817 3.483c-.7 3.008-2.083 4.225-4.683 3.975a9 9 0 0 1-1.35-.225l-1.4-.334c-3.475-.825-4.55-2.541-3.733-6.025l.816-3.491c.167-.709.367-1.325.617-1.834.975-2.016 2.633-2.558 5.417-1.9l1.391.325c3.492.817 4.559 2.542 3.742 6.025"
    />
    <path
      stroke="#759CFF"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12.717 16.158c-.517.35-1.167.642-1.959.9l-1.316.434c-3.309 1.066-5.05.175-6.125-3.134L2.25 11.067c-1.067-3.309-.183-5.059 3.125-6.125l1.317-.434c.341-.108.666-.2.975-.258-.25.508-.45 1.125-.617 1.833l-.817 3.492c-.816 3.483.259 5.2 3.734 6.025l1.4.333q.725.176 1.35.225M10.7 7.107l4.042 1.025M9.884 10.334l2.416.617"
    />
  </svg>
);
export default SvgLearningGuide;
