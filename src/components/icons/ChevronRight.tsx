import * as React from "react";
import type { SVGProps } from "react";
const SvgChevronRight = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12.5 10.416a.83.83 0 0 1-.244.59l-3.334 3.333a.832.832 0 1 1-1.178-1.178l2.754-2.755-2.65-2.744a.834.834 0 0 1 1.2-1.158l3.218 3.333c.156.163.234.371.234.58"
      clipRule="evenodd"
    />
  </svg>
);
export default SvgChevronRight;
