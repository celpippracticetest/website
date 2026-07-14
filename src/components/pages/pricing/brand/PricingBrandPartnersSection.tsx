"use client";

import Image, { type StaticImageData } from "next/image";
import img1 from "@/images/attachment.png";
import img2 from "@/images/attachment2.png";
import img3 from "@/images/attachment3.png";
import img5 from "@/images/attachment5.png";
import img6 from "@/images/attachment6.png";
import img7 from "@/images/attachment7.png";
import img8 from "@/images/attachment8.png";
import img9 from "@/images/attachment9.png";

const PARTNER_LOGOS: StaticImageData[] = [
  img1,
  img2,
  img3,
  img5,
  img6,
  img7,
  img8,
  img9,
];

export function PricingBrandPartnersSection() {
  return (
    <section className="mt-12 flex w-full flex-col items-center gap-6 screen744:mt-14 screen744:flex-row screen744:justify-between screen744:gap-8">
      <h3 className="max-w-[300px] text-center text-xl font-semibold text-[#1a2233] screen744:text-left screen744:text-2xl">
        Trusted by students from top universities
      </h3>
      <div className="flex flex-wrap justify-center gap-3 screen744:justify-end screen744:gap-4">
        {PARTNER_LOGOS.map((src, index) => (
          <div
            key={index}
            className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-[#e4e9f2] bg-white p-2 shadow-[6px_4px_16px_0px_rgba(252,122,80,0.22),_-6px_-4px_16px_0px_rgba(74,125,255,0.22)] transition-transform duration-300 hover:-translate-y-1"
          >
            <Image
              src={src}
              alt={`University logo ${index + 1}`}
              width={40}
              height={40}
              className="relative z-10 h-full w-full object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
