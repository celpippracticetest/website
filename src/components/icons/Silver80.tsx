import * as React from "react";
import type { SVGProps } from "react";
const SvgSilver80 = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={80}
    height={80}
    fill="none"
    {...props}
  >
    <g filter="url(#silver80_svg__a)">
      <path
        fill="url(#silver80_svg__b)"
        d="M37.406 71.11c.742.386 1.112.58 1.627.68.4.077.978.077 1.379 0 .514-.1.885-.294 1.626-.68 6.857-3.572 26.573-15.246 26.573-31.356V26.096c0-2.887 0-4.33-.472-5.572a7.2 7.2 0 0 0-1.975-2.85c-.996-.877-2.348-1.384-5.051-2.398l-19.362-7.26c-.75-.282-1.126-.423-1.512-.479q-.517-.075-1.033 0c-.387.056-.762.197-1.513.478l-19.361 7.261c-2.704 1.014-4.055 1.52-5.052 2.398a7.2 7.2 0 0 0-1.974 2.85c-.473 1.241-.473 2.685-.473 5.572v13.658c0 16.11 19.717 27.784 26.573 31.356"
      />
      <path
        stroke="#DCDBDB"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={4}
        d="M37.406 71.11c.742.386 1.112.58 1.627.68.4.077.978.077 1.379 0 .514-.1.885-.294 1.626-.68 6.857-3.572 26.573-15.246 26.573-31.356V26.096c0-2.887 0-4.33-.472-5.572a7.2 7.2 0 0 0-1.975-2.85c-.996-.877-2.348-1.384-5.051-2.398l-19.362-7.26c-.75-.282-1.126-.423-1.512-.479q-.517-.075-1.033 0c-.387.056-.762.197-1.513.478l-19.361 7.261c-2.704 1.014-4.055 1.52-5.052 2.398a7.2 7.2 0 0 0-1.974 2.85c-.473 1.241-.473 2.685-.473 5.572v13.658c0 16.11 19.717 27.784 26.573 31.356"
      />
    </g>
    <defs>
      <linearGradient
        id="silver80_svg__b"
        x1={65.833}
        x2={17.083}
        y1={18.75}
        y2={58.333}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#ABABAB" />
        <stop offset={0.51} stopColor="#fff" />
        <stop offset={1} stopColor="#ABABAB" />
      </linearGradient>
      <filter
        id="silver80_svg__a"
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
        <feColorMatrix values="0 0 0 0 0.488713 0 0 0 0 0.488713 0 0 0 0 0.488713 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2750_21686"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2750_21686"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default SvgSilver80;
