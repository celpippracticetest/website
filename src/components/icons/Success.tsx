import * as React from "react";
import type { SVGProps } from "react";
const SvgSuccess = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={64}
    height={64}
    fill="none"
    {...props}
  >
    <path
      fill="#0DAA94"
      d="M32 5.333C17.307 5.333 5.333 17.306 5.333 32c0 14.693 11.974 26.666 26.667 26.666S58.667 46.693 58.667 32C58.667 17.306 46.693 5.333 32 5.333m12.747 20.533-15.12 15.12a2 2 0 0 1-2.827 0l-7.547-7.546a2.01 2.01 0 0 1 0-2.827 2.01 2.01 0 0 1 2.827 0l6.133 6.133L41.92 23.04a2.01 2.01 0 0 1 2.827 0c.773.773.773 2.026 0 2.826"
    />
  </svg>
);
export default SvgSuccess;
