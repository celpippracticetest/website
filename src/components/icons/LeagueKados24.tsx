import * as React from "react";
import type { SVGProps } from "react";
const SvgLeagueKados24 = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <g clipPath="url(#leagueKados24_svg__a)">
      <rect width={22} height={16} x={1} y={4} fill="#FFEBD6" rx={2} />
      <path
        fill="url(#leagueKados24_svg__b)"
        fillRule="evenodd"
        d="M8.794 4h-.676v6.51A2.04 2.04 0 0 0 6.765 10c-1.121 0-2.03.895-2.03 2 0 .512.196.98.517 1.333H0V14h8.118v6h.676v-6H23v-.667H11.162c.212-.278.338-.624.338-1a1.68 1.68 0 0 0-1.691-1.666A1.7 1.7 0 0 0 8.794 11zm0 8.333v1H9.81c.56 0 1.015-.447 1.015-1s-.455-1-1.015-1-1.015.448-1.015 1m-.676 0V12c0-.736-.606-1.333-1.353-1.333-.748 0-1.353.597-1.353 1.333s.605 1.333 1.353 1.333h1.353z"
        clipRule="evenodd"
      />
    </g>
    <defs>
      <radialGradient
        id="leagueKados24_svg__b"
        cx={0}
        cy={0}
        r={1}
        gradientTransform="matrix(11.5 0 0 42.5 11.5 12)"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F26B3E" />
        <stop offset={1} stopColor="#FC8A65" />
      </radialGradient>
      <clipPath id="leagueKados24_svg__a">
        <rect width={22} height={16} x={1} y={4} fill="#fff" rx={2} />
      </clipPath>
    </defs>
  </svg>
);
export default SvgLeagueKados24;
