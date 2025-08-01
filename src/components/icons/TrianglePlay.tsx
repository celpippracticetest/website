import * as React from "react";
import type { SVGProps } from "react";
const SvgTrianglePlay = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <path
      fill="#37465C"
      d="M7.038 7.405c.008-1.54 1.68-2.494 3.009-1.718l8.974 5.24c1.33.777 1.32 2.701-.017 3.465L9.98 19.544c-1.337.763-3-.208-2.992-1.747z"
    />
  </svg>
);
export default SvgTrianglePlay;
