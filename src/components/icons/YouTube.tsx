import React from "react";

const SvgYouTube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2.5 17a3 3 0 0 0 2.1 2.1c1.86.5 7.4.5 7.4.5s5.54 0 7.4-.5a3 3 0 0 0 2.1-2.1c.5-1.86.5-5 .5-5s0-3.14-.5-5a3 3 0 0 0-2.1-2.1C17.54 4.4 12 4.4 12 4.4s-5.54 0-7.4.5A3 3 0 0 0 2.5 7c-.5 1.86-.5 5-.5 5s0 3.14.5 5z" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

export default SvgYouTube;
