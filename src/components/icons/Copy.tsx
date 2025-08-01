import * as React from "react";
import type { SVGProps } from "react";
const SvgCopy = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={21}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#37465C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M13.833 10.75v3.5c0 2.917-1.166 4.084-4.083 4.084h-3.5c-2.917 0-4.083-1.167-4.083-4.084v-3.5c0-2.916 1.166-4.083 4.083-4.083h3.5c2.917 0 4.083 1.167 4.083 4.083"
    />
    <path
      stroke="#37465C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M18.833 5.75v3.5c0 2.917-1.166 4.084-4.083 4.084h-.917V10.75c0-2.916-1.166-4.083-4.083-4.083H7.167V5.75c0-2.916 1.166-4.083 4.083-4.083h3.5c2.917 0 4.083 1.167 4.083 4.083"
    />
  </svg>
);
export default SvgCopy;
