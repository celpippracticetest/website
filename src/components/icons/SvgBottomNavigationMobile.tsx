import * as React from "react";
import type { SVGProps } from "react";

const SvgSvgBottomNavigationMobile = (props: SVGProps<SVGSVGElement>) => {
  const VB_W = 343;
  const VB_H = 80;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="calc(100% - 32px)"
      height={80}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none" // بیرونی فقط برای لAYOUT
      fill="none"
      style={{
        display: "block",
        padding: "0 16px",
        height: "80px",
        minHeight: "80px",
        maxHeight: "80px",
        flex: "0 0 80px",
      }}
      {...props}
    >
      {/* داخلی: نسبت را حفظ می‌کند تا دایره له نشود */}
      <svg
        x={0}
        y={0}
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <clipPath id="bn_clip" clipPathUnits="userSpaceOnUse">
            <path d="M172 0.5C184.688 0.5 191.786 5.13577 195.78 10.3105C198.485 13.8155 201.637 17.5627 205.237 20.4346C208.839 23.3073 212.927 25.335 217.5 25.335H327C335.56 25.335 342.5 32.2746 342.5 40.835V64C342.5 72.5604 335.56 79.5 327 79.5H16C7.43959 79.5 0.5 72.5604 0.5 64V40.835C0.500023 32.2746 7.4396 25.335 16 25.335H126.871C134.98 25.3348 141.747 19.1521 146.33 12.7285C150.683 6.62768 158.416 0.5 172 0.5Z" />
          </clipPath>

          <linearGradient
            id="bn_grad"
            x1="0"
            y1="40"
            x2="343"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity="0.6" />
            <stop offset="1" stopColor="white" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <foreignObject x={-8} y={-8} width={VB_W + 16} height={VB_H + 16}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              clipPath: "url(#bn_clip)",
              height: "100%",
              width: "100%",
            }}
          />
        </foreignObject>

        <path
          d="M172 0.5C184.688 0.5 191.786 5.13577 195.78 10.3105C198.485 13.8155 201.637 17.5627 205.237 20.4346C208.839 23.3073 212.927 25.335 217.5 25.335H327C335.56 25.335 342.5 32.2746 342.5 40.835V64C342.5 72.5604 335.56 79.5 327 79.5H16C7.43959 79.5 0.5 72.5604 0.5 64V40.835C0.500023 32.2746 7.4396 25.335 16 25.335H126.871C134.98 25.3348 141.747 19.1521 146.33 12.7285C150.683 6.62768 158.416 0.5 172 0.5Z"
          fill="url(#bn_grad)"
          stroke="#E6E6E6"
          strokeWidth={1}
          strokeLinejoin="round" // ← لبه‌ها نرم
          strokeLinecap="round" // ← لبه‌های باز (اگر باشند) گرد
          strokeMiterlimit={1.5} // ← جلوگیری از نوک‌تیزی
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </svg>
  );
};

export default SvgSvgBottomNavigationMobile;
