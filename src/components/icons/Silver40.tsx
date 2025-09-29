import * as React from "react";
import type { SVGProps } from "react";
const SvgSilver40 = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={40}
    height={40}
    fill="none"
    {...props}
  >
    <g filter="url(#silver40_svg__a)">
      <path
        fill="url(#silver40_svg__b)"
        d="M18.418 34.644c.346.187.52.28.76.328.187.037.457.037.644 0 .24-.048.414-.141.76-.328C23.786 32.924 33 27.3 33 19.54v-6.58c0-1.391 0-2.087-.22-2.684-.196-.529-.512-1-.924-1.373-.465-.423-1.097-.667-2.36-1.156l-9.048-3.498c-.35-.135-.526-.203-.707-.23a1.6 1.6 0 0 0-.482 0c-.18.027-.356.095-.707.23L9.504 7.746c-1.263.489-1.895.733-2.36 1.156a3.5 3.5 0 0 0-.923 1.373C6 10.872 6 11.567 6 12.959v6.58c0 7.76 9.214 13.384 12.418 15.105"
      />
      <path
        stroke="#DCDBDB"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.418 34.644c.346.187.52.28.76.328.187.037.457.037.644 0 .24-.048.414-.141.76-.328C23.786 32.924 33 27.3 33 19.54v-6.58c0-1.391 0-2.087-.22-2.684-.196-.529-.512-1-.924-1.373-.465-.423-1.097-.667-2.36-1.156l-9.048-3.498c-.35-.135-.526-.203-.707-.23a1.6 1.6 0 0 0-.482 0c-.18.027-.356.095-.707.23L9.504 7.746c-1.263.489-1.895.733-2.36 1.156a3.5 3.5 0 0 0-.923 1.373C6 10.872 6 11.567 6 12.959v6.58c0 7.76 9.214 13.384 12.418 15.105"
      />
    </g>
    <defs>
      <linearGradient
        id="silver40_svg__b"
        x1={31.702}
        x2={8.373}
        y1={9.42}
        y2={27.794}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#ABABAB" />
        <stop offset={0.51} stopColor="#fff" />
        <stop offset={1} stopColor="#ABABAB" />
      </linearGradient>
      <filter
        id="silver40_svg__a"
        width={29}
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
        <feColorMatrix values="0 0 0 0 0.488713 0 0 0 0 0.488713 0 0 0 0 0.488713 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2723_17236"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2723_17236"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default SvgSilver40;
