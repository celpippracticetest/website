import * as React from "react";
import type { SVGProps } from "react";
const SvgRecording = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={57}
    height={56}
    fill="none"
    {...props}
  >
    <rect
      width={52}
      height={52}
      x={2.5}
      y={2}
      stroke="#673EFA"
      strokeWidth={4}
      rx={26}
    />
    <rect width={24} height={24} x={16.5} y={16} fill="#673EFA" rx={4} />
  </svg>
);
export default SvgRecording;
