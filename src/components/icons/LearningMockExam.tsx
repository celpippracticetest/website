import * as React from "react";
import type { SVGProps } from "react";
const SvgLearningMockExam = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={21}
    height={20}
    fill="none"
    {...props}
  >
    <path
      stroke="#DA2AFE"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10.808 7.4h4.375M5.817 7.4l.625.625L8.317 6.15M10.808 13.232h4.375M5.817 13.232l.625.625 1.875-1.875"
    />
    <path
      stroke="#DA2AFE"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 18.333h5c4.167 0 5.833-1.667 5.833-5.834v-5c0-4.166-1.666-5.833-5.833-5.833H8c-4.167 0-5.833 1.667-5.833 5.833v5c0 4.167 1.666 5.834 5.833 5.834"
    />
  </svg>
);
export default SvgLearningMockExam;
