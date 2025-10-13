import * as React from "react";
import type { SVGProps } from "react";
const SvgBronz40 = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={40}
    height={40}
    fill="none"
    {...props}
  >
    <g filter="url(#bronz40_svg__a)">
      <path
        fill="url(#bronz40_svg__b)"
        d="M18.878 34.644c.359.187.538.28.788.328.194.037.474.037.668 0 .25-.048.43-.141.788-.328C24.446 32.924 34 27.3 34 19.54v-6.58c0-1.391 0-2.087-.229-2.684-.202-.529-.53-1-.957-1.373-.483-.423-1.138-.667-2.448-1.156l-9.383-3.498c-.364-.135-.546-.203-.733-.23a1.8 1.8 0 0 0-.5 0c-.187.027-.37.095-.733.23L9.634 7.746c-1.31.489-1.965.733-2.448 1.156a3.5 3.5 0 0 0-.957 1.373C6 10.872 6 11.567 6 12.959v6.58c0 7.76 9.555 13.384 12.878 15.105"
      />
      <path
        stroke="#E8B384"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.878 34.644c.359.187.538.28.788.328.194.037.474.037.668 0 .25-.048.43-.141.788-.328C24.446 32.924 34 27.3 34 19.54v-6.58c0-1.391 0-2.087-.229-2.684-.202-.529-.53-1-.957-1.373-.483-.423-1.138-.667-2.448-1.156l-9.383-3.498c-.364-.135-.546-.203-.733-.23a1.8 1.8 0 0 0-.5 0c-.187.027-.37.095-.733.23L9.634 7.746c-1.31.489-1.965.733-2.448 1.156a3.5 3.5 0 0 0-.957 1.373C6 10.872 6 11.567 6 12.959v6.58c0 7.76 9.555 13.384 12.878 15.105"
      />
    </g>
    <defs>
      <linearGradient
        id="bronz40_svg__b"
        x1={32.654}
        x2={9.14}
        y1={9.42}
        y2={28.625}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFB26E" />
        <stop offset={0.51} stopColor="#FFF0E2" />
        <stop offset={1} stopColor="#FFB26E" />
      </linearGradient>
      <filter
        id="bronz40_svg__a"
        width={30}
        height={35}
        x={5}
        y={3}
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
        <feColorMatrix values="0 0 0 0 0.623529 0 0 0 0 0.388235 0 0 0 0 0.188235 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2723_17213"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2723_17213"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default SvgBronz40;
