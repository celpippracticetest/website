import * as React from "react";
import type { SVGProps } from "react";
const SvgLeagueLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <g filter="url(#leagueLogo_svg__a)">
      <path
        fill="url(#leagueLogo_svg__b)"
        d="M11.327 20.787c.215.112.323.168.472.197a1.2 1.2 0 0 0 .402 0c.149-.03.257-.085.472-.197 1.994-1.032 7.727-4.407 7.727-9.063V7.776c0-.835 0-1.252-.137-1.61a2.1 2.1 0 0 0-.575-.825c-.29-.253-.682-.4-1.468-.693L12.59 2.55c-.218-.081-.328-.122-.44-.138q-.15-.021-.3 0c-.112.016-.222.057-.44.138l-5.63 2.1c-.786.292-1.179.439-1.468.692a2.1 2.1 0 0 0-.575.824c-.137.359-.137.776-.137 1.61v3.949c0 4.656 5.733 8.03 7.726 9.063"
      />
      <path
        stroke="#DCBC62"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.327 20.787c.215.112.323.168.472.197a1.2 1.2 0 0 0 .402 0c.149-.03.257-.085.472-.197 1.994-1.032 7.727-4.407 7.727-9.063V7.776c0-.835 0-1.252-.137-1.61a2.1 2.1 0 0 0-.575-.825c-.29-.253-.682-.4-1.468-.693L12.59 2.55c-.218-.081-.328-.122-.44-.138q-.15-.021-.3 0c-.112.016-.222.057-.44.138l-5.63 2.1c-.786.292-1.179.439-1.468.692a2.1 2.1 0 0 0-.575.824c-.137.359-.137.776-.137 1.61v3.949c0 4.656 5.733 8.03 7.726 9.063"
      />
    </g>
    <defs>
      <linearGradient
        id="leagueLogo_svg__b"
        x1={19.592}
        x2={5.484}
        y1={5.652}
        y2={17.176}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F7D75F" />
        <stop offset={0.51} stopColor="#FDFCF5" />
        <stop offset={1} stopColor="#F7D75F" />
      </linearGradient>
      <filter
        id="leagueLogo_svg__a"
        width={18.8}
        height={22.6}
        x={2.6}
        y={1.4}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset dy={2} />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0.593543 0 0 0 0 0.460044 0 0 0 0 0.104044 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_3285_8843"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_3285_8843"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default SvgLeagueLogo;
