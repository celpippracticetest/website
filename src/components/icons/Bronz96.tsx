import * as React from "react";
import type { SVGProps } from "react";
const SvgBronz96 = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={96}
    height={96}
    fill="none"
    {...props}
  >
    <g filter="url(#bronz96_svg__a)">
      <path
        fill="url(#bronz96_svg__b)"
        d="M44.887 85.332c.89.463 1.335.695 1.952.815a4.9 4.9 0 0 0 1.655 0c.617-.12 1.062-.352 1.952-.815 8.227-4.287 31.887-18.295 31.887-37.627v-16.39c0-3.465 0-5.197-.567-6.686a8.66 8.66 0 0 0-2.37-3.42c-1.195-1.053-2.817-1.661-6.06-2.878L50.1 9.618c-.9-.338-1.351-.506-1.815-.573-.41-.06-.828-.06-1.239 0-.464.067-.914.235-1.815.573l-23.234 8.713c-3.244 1.217-4.866 1.825-6.062 2.878a8.7 8.7 0 0 0-2.37 3.42C13 26.12 13 27.85 13 31.315v16.39c0 19.332 23.66 33.34 31.887 37.627"
      />
      <path
        stroke="#E8B384"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={4}
        d="M44.887 85.332c.89.463 1.335.695 1.952.815a4.9 4.9 0 0 0 1.655 0c.617-.12 1.062-.352 1.952-.815 8.227-4.287 31.887-18.295 31.887-37.627v-16.39c0-3.465 0-5.197-.567-6.686a8.66 8.66 0 0 0-2.37-3.42c-1.195-1.053-2.817-1.661-6.06-2.878L50.1 9.618c-.9-.338-1.351-.506-1.815-.573-.41-.06-.828-.06-1.239 0-.464.067-.914.235-1.815.573l-23.234 8.713c-3.244 1.217-4.866 1.825-6.062 2.878a8.7 8.7 0 0 0-2.37 3.42C13 26.12 13 27.85 13 31.315v16.39c0 19.332 23.66 33.34 31.887 37.627"
      />
    </g>
    <defs>
      <linearGradient
        id="bronz96_svg__b"
        x1={79}
        x2={20.5}
        y1={22.5}
        y2={70}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFB26E" />
        <stop offset={0.51} stopColor="#FFF0E2" />
        <stop offset={1} stopColor="#FFB26E" />
      </linearGradient>
      <filter
        id="bronz96_svg__a"
        width={73.334}
        height={85.217}
        x={11}
        y={7}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset dy={4} />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0.623529 0 0 0 0 0.388235 0 0 0 0 0.188235 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2723_17698"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2723_17698"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default SvgBronz96;
