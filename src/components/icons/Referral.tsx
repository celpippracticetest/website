import * as React from "react";
import type { SVGProps } from "react";
const SvgReferral = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
      d="M13.313 6.667H2.647V12c0 2 .666 2.667 2.666 2.667h5.334c2 0 2.666-.667 2.666-2.667zM14.333 4.666v.667c0 .733-.353 1.333-1.333 1.333H3c-1.02 0-1.333-.6-1.333-1.333v-.667c0-.733.313-1.333 1.333-1.333h10c.98 0 1.333.6 1.333 1.333M7.76 3.333H4.08a.624.624 0 0 1 .02-.866l.947-.947a.64.64 0 0 1 .9 0zM11.913 3.333h-3.68l1.814-1.813a.64.64 0 0 1 .9 0l.946.947c.24.24.247.62.02.866"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
      d="M5.96 6.667v3.427c0 .533.587.846 1.033.56l.627-.414a.67.67 0 0 1 .733 0l.594.4a.665.665 0 0 0 1.033-.553v-3.42z"
    />
  </svg>
);
export default SvgReferral;
