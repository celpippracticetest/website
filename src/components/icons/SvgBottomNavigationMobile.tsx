import * as React from "react";
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  width?: number;
  marginX?: number;
  notchFactor?: number;
};

const SvgBottomNavigationMobile = ({
  width = 696,
  marginX = 24,
  notchFactor = 1.3,
  ...props
}: Props) => {
  const H = 82 as const;

  const cx = width / 2;

  const left = marginX;
  const right = width - marginX;

  const topY = 0.5;
  const midY = 36.756;
  const bottomInnerY = H - 16;
  const bottomStrokeY = H - 0.5;

  const START_TO_CENTER_BASE = 47.388;
  const CP1_OFFSET_BASE = 26.931;
  const CP2_OFFSET_BASE = 15.426;

  const START_TO_CENTER = START_TO_CENTER_BASE * notchFactor;
  const CP1_OFFSET = CP1_OFFSET_BASE * notchFactor;
  const CP2_OFFSET = CP2_OFFSET_BASE * notchFactor;

  const startXLeftCurve = cx - START_TO_CENTER;
  const cp1x = cx - CP1_OFFSET;
  const cp2x = cx - CP2_OFFSET;

  const sx = (v: number) => v * notchFactor;

  const d = [
    `M${cx} ${topY}`,
    `c${sx(15.112)} 0 ${sx(26.077)} 8.034 ${sx(32.182)} 14.072`,
    `${sx(3.884)} 3.842 ${sx(9.007)} 6.684 ${sx(14.557)} 6.684`,
    `H${right}`,
    `c8.56 0 15.5 6.94 15.5 15.5`,
    `V${bottomInnerY}`,
    `c0 8.56-6.94 15.5-15.5 15.5`,
    `H${left}`,
    `C15.44 ${bottomStrokeY} 8.5 ${bottomInnerY - 0.5} 8.5 ${bottomInnerY}`,
    `V${midY}`,
    `c0-8.56 6.94-15.5 15.5-15.5`,
    `H${startXLeftCurve}`,
    `c5.363 0 10.333-2.642 14.141-6.306`,
    `C${cp1x} 8.872 ${cp2x} ${topY} ${cx} ${topY}Z`,
  ].join(" ");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={H}
      viewBox={`0 0 ${width} ${H}`}
      fill="none"
      preserveAspectRatio="none"
      style={{ height: H, minHeight: H, maxHeight: H }}
      {...props}
    >
      <foreignObject width={width + 16} height={H + 16} x={-8} y={-8}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            backdropFilter: "blur(4px)",
            clipPath: "url(#clip)",
            height: "100%",
            width: "100%",
          }}
        />
      </foreignObject>

      <path fill="url(#grad)" stroke="#E6E6E6" d={d} />

      <defs>
        <linearGradient
          id="grad"
          x1={0}
          x2={width}
          y1={H / 2}
          y2={H / 2}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity={0.65} />
          <stop offset={1} stopColor="#fff" stopOpacity={0.2} />
        </linearGradient>

        <clipPath id="clip" transform="translate(8 8)">
          <path d={d} />
        </clipPath>
      </defs>
    </svg>
  );
};

export default SvgBottomNavigationMobile;
