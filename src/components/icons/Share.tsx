import * as React from "react";
import type { SVGProps } from "react";
const SvgShare = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={17}
    height={16}
    fill="none"
    {...props}
  >
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4.353 9.707a1.853 1.853 0 1 0 0-3.707 1.853 1.853 0 0 0 0 3.707M12.353 5.707a1.853 1.853 0 1 0 0-3.707 1.853 1.853 0 0 0 0 3.707M12.353 13.707a1.853 1.853 0 1 0 0-3.707 1.853 1.853 0 0 0 0 3.707"
    />
    <path
      fill="#fff"
      d="M10.643 5.436a.75.75 0 1 0-.75-1.3l.375.65zM6.065 7.213l.375.65 4.203-2.427-.375-.65-.375-.65L5.69 6.564zM10.412 10.443a.75.75 0 1 1-.75 1.3l.374-.65zM5.833 8.666l.375-.65 4.204 2.427-.376.65-.374.65-4.204-2.427z"
    />
  </svg>
);
export default SvgShare;
