import * as React from "react";
import type { SVGProps } from "react";
const SvgAllSkills = (props: SVGProps<SVGSVGElement>) => (
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
      d="m18.05 8.7-.817 3.483c-.7 3.009-2.083 4.225-4.683 3.975a9 9 0 0 1-1.35-.225L9.8 15.6c-3.475-.825-4.55-2.542-3.733-6.025l.816-3.492c.167-.708.367-1.325.617-1.833.975-2.017 2.633-2.558 5.417-1.9l1.391.325c3.492.817 4.559 2.542 3.742 6.025"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12.55 16.158c-.517.35-1.167.642-1.958.9l-1.317.434c-3.308 1.066-5.05.175-6.125-3.134l-1.067-3.291C1.017 7.758 1.9 6.008 5.208 4.942l1.317-.434c.342-.108.667-.2.975-.258-.25.508-.45 1.125-.617 1.833l-.816 3.492c-.817 3.483.258 5.2 3.733 6.025l1.4.333q.725.176 1.35.225M10.533 7.108l4.042 1.025M9.717 10.333l2.416.617"
    />
  </svg>
);
export default SvgAllSkills;
