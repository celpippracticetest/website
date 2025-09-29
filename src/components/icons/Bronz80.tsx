import * as React from "react";
import type { SVGProps } from "react";
const SvgBronz80 = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={80}
    height={80}
    fill="none"
    {...props}
  >
    <g filter="url(#bronz80_svg__a)">
      <path
        fill="url(#bronz80_svg__b)"
        d="M37.406 71.11c.741.386 1.112.58 1.626.68.401.077.979.077 1.38 0 .514-.1.885-.294 1.626-.68 6.856-3.573 26.573-15.246 26.573-31.356V26.096c0-2.887 0-4.33-.472-5.572a7.2 7.2 0 0 0-1.975-2.85c-.996-.877-2.348-1.384-5.051-2.398L41.75 8.016c-.75-.282-1.126-.423-1.512-.479q-.517-.075-1.033 0c-.387.056-.762.197-1.513.478l-19.362 7.261c-2.703 1.014-4.055 1.52-5.05 2.398a7.2 7.2 0 0 0-1.976 2.85c-.472 1.241-.472 2.685-.472 5.572v13.658c0 16.11 19.717 27.783 26.573 31.356"
      />
      <path
        stroke="#E8B384"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={4}
        d="M37.406 71.11c.741.386 1.112.58 1.626.68.401.077.979.077 1.38 0 .514-.1.885-.294 1.626-.68 6.856-3.573 26.573-15.246 26.573-31.356V26.096c0-2.887 0-4.33-.472-5.572a7.2 7.2 0 0 0-1.975-2.85c-.996-.877-2.348-1.384-5.051-2.398L41.75 8.016c-.75-.282-1.126-.423-1.512-.479q-.517-.075-1.033 0c-.387.056-.762.197-1.513.478l-19.362 7.261c-2.703 1.014-4.055 1.52-5.05 2.398a7.2 7.2 0 0 0-1.976 2.85c-.472 1.241-.472 2.685-.472 5.572v13.658c0 16.11 19.717 27.783 26.573 31.356"
      />
    </g>
    <defs>
      <linearGradient
        id="bronz80_svg__b"
        x1={65.833}
        x2={17.083}
        y1={18.75}
        y2={58.333}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFB26E" />
        <stop offset={0.51} stopColor="#FFF0E2" />
        <stop offset={1} stopColor="#FFB26E" />
      </linearGradient>
      <filter
        id="bronz80_svg__a"
        width={61.778}
        height={72.348}
        x={8.833}
        y={5.5}
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
          result="effect1_dropShadow_2723_17836"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2723_17836"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default SvgBronz80;
