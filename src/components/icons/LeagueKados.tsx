import * as React from "react";
import type { SVGProps } from "react";
const SvgLeagueKados = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={34}
    height={34}
    fill="none"
    {...props}
  >
    <g clipPath="url(#leagueKados_svg__a)">
      <rect
        width={31.167}
        height={22.667}
        x={1.417}
        y={5.666}
        fill="#FFEBD6"
        rx={2}
      />
      <path
        fill="url(#leagueKados_svg__b)"
        fillRule="evenodd"
        d="M12.458 5.666H11.5v9.221a2.9 2.9 0 0 0-1.917-.721c-1.588 0-2.875 1.268-2.875 2.833a2.8 2.8 0 0 0 .732 1.89H0v.944h11.5v8.5h.958v-8.5h20.125v-.945h-16.77c.3-.394.479-.885.479-1.416 0-1.304-1.073-2.362-2.396-2.362-.54 0-1.037.176-1.438.473zm0 11.806v1.416h1.438c.794 0 1.437-.634 1.437-1.416 0-.783-.643-1.417-1.437-1.417s-1.438.634-1.438 1.417m-.958 0v-.473c0-1.043-.858-1.888-1.917-1.888-1.058 0-1.916.845-1.916 1.888 0 1.044.858 1.89 1.916 1.89H11.5z"
        clipRule="evenodd"
      />
    </g>
    <defs>
      <radialGradient
        id="leagueKados_svg__b"
        cx={0}
        cy={0}
        r={1}
        gradientTransform="matrix(16.2917 0 0 60.2083 16.292 17)"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F26B3E" />
        <stop offset={1} stopColor="#FC8A65" />
      </radialGradient>
      <clipPath id="leagueKados_svg__a">
        <rect
          width={31.167}
          height={22.667}
          x={1.417}
          y={5.666}
          fill="#fff"
          rx={2}
        />
      </clipPath>
    </defs>
  </svg>
);
export default SvgLeagueKados;
