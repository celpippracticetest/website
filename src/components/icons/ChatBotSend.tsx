import * as React from "react";
import type { SVGProps } from "react";
const SvgChatBotSend = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#37465C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m7.925 3.525 7.133 3.567c3.2 1.6 3.2 4.216 0 5.816l-7.133 3.567c-4.8 2.4-6.758.433-4.358-4.359l.725-1.441c.183-.367.183-.975 0-1.342l-.725-1.45c-2.4-4.791-.434-6.758 4.358-4.358M4.533 10h4.5"
    />
  </svg>
);
export default SvgChatBotSend;
