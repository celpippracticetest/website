import * as React from "react";
import type { SVGProps } from "react";

const SvgBottomNavigation = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1231 82"
    width="100%"
    height={82}
    preserveAspectRatio="none"
    fill="none"
    style={{ display: "block", height: 82, overflow: "hidden" }}
    {...props}
  >
    <foreignObject x={0} y={0} width="100%" height="100%">
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          clipPath: "url(#bottom-navigation_svg__clip)",
          height: "100%",
          width: "100%",
        }}
      />
    </foreignObject>

    <path
      fill="url(#bottom-navigation_svg__grad)"
      stroke="#E6E6E6"
      d="M615.5.5c24.067 0 37.032 6.458 43.768 12.089 5.118 4.279 11.456 8.667 18.324 8.667H1215c8.56 0 15.5 6.94 15.5 15.5V66c0 8.56-6.94 15.5-15.5 15.5H16C7.44 81.5.5 74.56.5 66V36.756l.005-.4c.212-8.376 7.068-15.1 15.495-15.1h537.893c7.124 0 13.689-4.739 19.003-9.157C579.515 6.595 592.118.5 615.5.5Z"
      data-figma-bg-blur-radius={8}
    />

    <defs>
      <linearGradient
        id="bottom-navigation_svg__grad"
        x1="0%"
        y1="50%"
        x2="100%"
        y2="50%"
        gradientUnits="objectBoundingBox"
      >
        <stop stopColor="#fff" stopOpacity={0.65} />
        <stop offset={1} stopColor="#fff" stopOpacity={0.2} />
      </linearGradient>

      <clipPath id="bottom-navigation_svg__clip">
        <path d="M615.5.5c24.067 0 37.032 6.458 43.768 12.089 5.118 4.279 11.456 8.667 18.324 8.667H1215c8.56 0 15.5 6.94 15.5 15.5V66c0 8.56-6.94 15.5-15.5 15.5H16C7.44 81.5.5 74.56.5 66V36.756l.005-.4c.212-8.376 7.068-15.1 15.495-15.1h537.893c7.124 0 13.689-4.739 19.003-9.157C579.515 6.595 592.118.5 615.5.5Z" />
      </clipPath>
    </defs>
  </svg>
);

export default SvgBottomNavigation;
