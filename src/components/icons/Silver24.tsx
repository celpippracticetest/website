import * as React from "react";
import type { SVGProps } from "react";
const SvgSilver24 = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <g filter="url(#silver24_svg__a)">
      <path
        fill="url(#silver24_svg__b)"
        d="M11.05 20.787c.208.112.312.168.457.197.112.022.274.022.386 0 .144-.03.248-.085.456-.197 1.923-1.032 7.451-4.407 7.451-9.063V7.776c0-.835 0-1.252-.133-1.61a2.1 2.1 0 0 0-.553-.825c-.28-.253-.658-.4-1.416-.693l-5.43-2.099c-.21-.081-.315-.122-.423-.138a1 1 0 0 0-.29 0c-.108.016-.213.057-.424.138l-5.429 2.1c-.758.292-1.137.439-1.416.692a2.1 2.1 0 0 0-.554.824c-.132.359-.132.776-.132 1.61v3.949c0 4.656 5.528 8.03 7.45 9.063"
      />
      <path
        stroke="#DCDBDB"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.05 20.787c.208.112.312.168.457.197.112.022.274.022.386 0 .144-.03.248-.085.456-.197 1.923-1.032 7.451-4.407 7.451-9.063V7.776c0-.835 0-1.252-.133-1.61a2.1 2.1 0 0 0-.553-.825c-.28-.253-.658-.4-1.416-.693l-5.43-2.099c-.21-.081-.315-.122-.423-.138a1 1 0 0 0-.29 0c-.108.016-.213.057-.424.138l-5.429 2.1c-.758.292-1.137.439-1.416.692a2.1 2.1 0 0 0-.554.824c-.132.359-.132.776-.132 1.61v3.949c0 4.656 5.528 8.03 7.45 9.063"
      />
    </g>
    <defs>
      <linearGradient
        id="silver24_svg__b"
        x1={19.021}
        x2={5.024}
        y1={5.652}
        y2={16.677}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#ABABAB" />
        <stop offset={0.51} stopColor="#fff" />
        <stop offset={1} stopColor="#ABABAB" />
      </linearGradient>
      <filter
        id="silver24_svg__a"
        width={18.201}
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
        <feColorMatrix values="0 0 0 0 0.488713 0 0 0 0 0.488713 0 0 0 0 0.488713 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2723_18037"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2723_18037"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default SvgSilver24;
